import type { ChatConversation, ChatMessage, ChatStatus } from './chatTypes';

/**
 * Fase 3 — estado del chat en el cliente (funciones puras, probadas aparte).
 *
 * Los mensajes pueden llegar por tres vías y en cualquier orden: la respuesta del POST, el evento SSE y la
 * recuperación tras desconexión (after=seq). Se fusionan por id (sin duplicados), se concilian con el envío optimista
 * por clientMessageId y se ordenan por seq (orden del servidor).
 */

/** Fusiona mensajes del servidor con los locales: sin duplicados y en orden de seq; los pendientes, al final. */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  const pending: ChatMessage[] = [];
  for (const m of current) {
    if (m.localState) pending.push(m);
    else byId.set(m.id, m);
  }
  for (const m of incoming) {
    byId.set(m.id, { ...byId.get(m.id), ...m, localState: undefined });
  }
  // Un pendiente cuyo envío ya confirmó el servidor (mismo clientMessageId) desaparece.
  const confirmed = new Set([...byId.values()].map((m) => m.clientMessageId).filter(Boolean) as string[]);
  const stillPending = pending.filter((p) => !p.clientMessageId || !confirmed.has(p.clientMessageId));
  const server = [...byId.values()].sort((a, b) => a.seq - b.seq);
  return [...server, ...stillPending];
}

/** Sustituye el mensaje optimista (por clientMessageId) por el confirmado. */
export function confirmMessage(current: ChatMessage[], clientMessageId: string, confirmed: ChatMessage): ChatMessage[] {
  const without = current.filter((m) => !(m.localState && m.clientMessageId === clientMessageId));
  return mergeMessages(without, [{ ...confirmed, clientMessageId }]);
}

export function markFailed(current: ChatMessage[], clientMessageId: string): ChatMessage[] {
  return current.map((m) => (m.localState && m.clientMessageId === clientMessageId ? { ...m, localState: 'failed' } : m));
}

export function markSending(current: ChatMessage[], clientMessageId: string): ChatMessage[] {
  return current.map((m) => (m.localState && m.clientMessageId === clientMessageId ? { ...m, localState: 'sending' } : m));
}

/** Mayor seq confirmado por el servidor (0 si no hay). */
export function lastServerSeq(messages: ChatMessage[]): number {
  return messages.reduce((max, m) => (!m.localState && m.seq > max ? m.seq : max), 0);
}

/** ¿El mensaje recibido deja un hueco (se perdió alguno) respecto a lo que ya tenemos? */
export function hasGap(messages: ChatMessage[], incoming: ChatMessage): boolean {
  const last = lastServerSeq(messages);
  return last > 0 && incoming.seq > last + 1;
}

/** Inserta o actualiza una conversación y ordena por actividad reciente. */
export function upsertConversation(list: ChatConversation[], c: ChatConversation): ChatConversation[] {
  const others = list.filter((x) => x.id !== c.id);
  return sortConversations([c, ...others]);
}

export function sortConversations(list: ChatConversation[]): ChatConversation[] {
  const key = (c: ChatConversation) => new Date(c.lastMessageAt ?? c.createdAt).getTime() || 0;
  return [...list].sort((a, b) => key(b) - key(a));
}

/** Id aleatorio para la idempotencia del envío (crypto.randomUUID con respaldo). */
export function newClientMessageId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const STATUS_LABEL_STAFF: Record<ChatStatus, string> = {
  PENDING: 'Pendiente',
  ACTIVE: 'En atención',
  CLOSED: 'Cerrada',
};

export const STATUS_LABEL_RESIDENT: Record<ChatStatus, string> = {
  PENDING: 'Esperando a portería',
  ACTIVE: 'Portería te está atendiendo',
  CLOSED: 'Conversación cerrada',
};

/** Mensajes del personal: «Nombre del portero · Portería» (o solo «Portería» si no hay nombre). */
export function staffLabel(name: string | null | undefined): string {
  const n = (name ?? '').trim();
  return n && n !== 'Portería' ? `${n} · Portería` : 'Portería';
}

/** «14:05» hoy, «ayer 14:05» o «12 nov 14:05». */
export function formatChatTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, now)) return time;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return `ayer ${time}`;
  return `${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} ${time}`;
}
