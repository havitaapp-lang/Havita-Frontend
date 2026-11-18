import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, History, Inbox, Loader2, LogOut, MessageCirclePlus, Search, Shuffle, UserCheck, X,
} from 'lucide-react';
import { apiErrorCode } from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';
import { cn } from '../../utils/cn';
import { ChatThread } from './ChatThread';
import { ChatPushPrompt } from './ChatPushPrompt';
import { staffChatService } from './chatService';
import { STATUS_LABEL_STAFF, formatChatTime, upsertConversation } from './chatState';
import type { ChatAgent, ChatConversation, ChatEventEntry, ChatResidentOption, InboxFilter } from './chatTypes';
import { useChatEvents } from './useChatEvents';
import { useChatThread, type ThreadApi } from './useChatThread';

const FILTERS: { value: InboxFilter; label: string }[] = [
  { value: 'OPEN', label: 'Abiertas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'MINE', label: 'Mías' },
  { value: 'CLOSED', label: 'Cerradas' },
];

const EVENT_LABEL: Record<ChatEventEntry['type'], string> = {
  CREATED: 'Conversación creada',
  CLAIMED: 'Tomada',
  RELEASED: 'Liberada',
  TRANSFERRED: 'Transferida',
  AUTO_RELEASED: 'Liberada automáticamente (sin respuesta del responsable o pérdida de acceso)',
  CLOSED: 'Cerrada',
  REOPENED: 'Reabierta',
};

const threadApi: ThreadApi = {
  messages: staffChatService.messages,
  send: (id, body, clientMessageId) => {
    if (!id) return Promise.reject(new Error('Sin conversación'));
    return staffChatService.send(id, body, clientMessageId);
  },
  read: staffChatService.read,
};

function errorMessage(err: unknown, fallback: string): string {
  const msg = (err as { data?: { message?: string } })?.data?.message;
  return apiErrorCode(err) && msg ? msg : fallback;
}

/**
 * Fase 3 — bandeja compartida de portería. Todos los porteros ven las conversaciones de la comunidad; solo el
 * responsable responde, libera, transfiere o cierra una conversación en atención. Tiempo real por SSE.
 * `readOnly`: vista de la administración (consulta la bandeja, los mensajes y el historial; no opera).
 */
export const SecurityChatPage = ({ readOnly = false }: { readOnly?: boolean }) => {
  const { user } = useAuth();
  const me = user?.id ?? '';
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<InboxFilter>('OPEN');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<ChatConversation[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(params.get('c'));
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ChatEventEntry[]>([]);
  const [agents, setAgents] = useState<ChatAgent[] | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadInbox = useCallback(async () => {
    try {
      const page = await staffChatService.inbox(filter, debounced);
      setItems(page.content);
      setInboxError(null);
    } catch {
      setInboxError('No se pudo cargar la bandeja.');
    } finally {
      setInboxLoading(false);
    }
  }, [filter, debounced]);

  useEffect(() => {
    setInboxLoading(true);
    void loadInbox();
  }, [loadInbox]);

  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => void loadInbox(), 500);
  }, [loadInbox]);

  useEffect(() => () => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
  }, []);

  const applyConversation = useCallback((c: ChatConversation) => {
    setItems((list) => (list.some((x) => x.id === c.id) ? upsertConversation(list, c) : list));
    setSelected((cur) => (cur && cur.id === c.id ? c : cur));
  }, []);

  // Seleccion: URL ?c=… y detalle (si no esta en la pagina actual de la bandeja, se pide).
  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    setShowHistory(false);
    setShowTransfer(false);
    const next = new URLSearchParams(params);
    if (id) next.set('c', id);
    else next.delete('c');
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    const inList = items.find((c) => c.id === selectedId);
    if (inList) {
      setSelected(inList);
      return;
    }
    staffChatService.get(selectedId).then(setSelected).catch(() => {
      setSelected(null);
      setSelectedId(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const mine = !!selected && selected.status === 'ACTIVE' && selected.assignedToUserId === me;

  const thread = useChatThread({
    conversationId: selectedId,
    api: threadApi,
    selfRole: 'STAFF',
    selfName: user?.name || 'Portería',
    canMarkRead: mine && !readOnly,
    readSeq: selected?.readSeq ?? 0,
    onConversation: applyConversation,
  });

  useChatEvents(
    (_type, payload) => {
      applyConversation(payload.conversation);
      if (payload.message) thread.applyIncoming(payload.message);
      scheduleRefetch(); // respeta filtro y búsqueda (una conversación nueva o que cambia de estado)
    },
    () => {
      void loadInbox();
      void thread.catchUp().catch(() => undefined);
    },
  );

  const act = async (name: string, fn: () => Promise<ChatConversation>, ok?: string) => {
    setBusy(name);
    try {
      const c = await fn();
      applyConversation(c);
      setSelected(c);
      scheduleRefetch();
      if (ok) notificationService.showToast(ok, 'success');
      if (showHistory && selectedId) setHistory(await staffChatService.events(selectedId));
    } catch (err) {
      notificationService.showToast(errorMessage(err, 'No se pudo completar la acción.'), 'error');
      if (selectedId) staffChatService.get(selectedId).then(applyConversation).catch(() => undefined);
    } finally {
      setBusy(null);
    }
  };

  const openHistory = async () => {
    if (!selectedId) return;
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    try {
      setHistory(await staffChatService.events(selectedId));
      setShowHistory(true);
    } catch {
      notificationService.showToast('No se pudo cargar el historial.', 'error');
    }
  };

  const openTransfer = async () => {
    setShowTransfer((v) => !v);
    if (!agents) {
      try {
        setAgents(await staffChatService.agents());
      } catch {
        setAgents([]);
      }
    }
  };

  const disabledReason = useMemo(() => {
    if (!selected) return null;
    if (readOnly) return 'Vista de administración: solo lectura. Responde portería.';
    if (selected.status === 'ACTIVE' && selected.assignedToUserId !== me) {
      return `La atiende ${selected.assignedToName ?? 'otro portero'}. Si necesitas responder, pídele que te la transfiera.`;
    }
    return null;
  }, [selected, me, readOnly]);

  const notice = !selected || readOnly ? null
    : selected.status === 'PENDING' ? 'Pendiente de atención: al responder, la conversación quedará a tu cargo.'
      : selected.status === 'CLOSED' ? 'Conversación cerrada. Si escribes, se reabrirá y quedará a tu cargo.'
        : null;

  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)] lg:h-[calc(100dvh-7rem)] min-h-[480px]">
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            {readOnly ? 'Chat de portería' : 'Chat con residentes'}
          </h1>
          <p className="text-xs text-slate-500">
            {readOnly ? 'Consulta de la bandeja de portería · Solo lectura' : 'Bandeja compartida de portería · Solo mensajes de texto'}
          </p>
        </div>
        {!readOnly && (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3 rounded-xl bg-[#16345F] text-white text-sm font-bold hover:bg-blue-700"
          data-testid="chat-new"
        >
          <MessageCirclePlus className="w-4 h-4" /> <span className="hidden sm:inline">Nueva conversación</span>
        </button>
        )}
      </div>

      {!readOnly && <ChatPushPrompt who="staff" />}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-3">
        {/* Bandeja */}
        <section className={cn('min-h-0 flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden', selectedId && 'hidden lg:flex')}>
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar residente, torre o apartamento"
                aria-label="Buscar conversaciones"
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#16345F]/30"
                data-testid="chat-search"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap',
                    filter === f.value ? 'bg-[#16345F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                  data-testid={`chat-filter-${f.value}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto" data-testid="chat-inbox">
            {inboxLoading && <div className="flex justify-center py-8 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>}
            {!inboxLoading && inboxError && (
              <div className="p-4 text-sm text-rose-700" role="alert">
                {inboxError}{' '}
                <button type="button" onClick={() => void loadInbox()} className="font-bold underline">Reintentar</button>
              </div>
            )}
            {!inboxLoading && !inboxError && items.length === 0 && (
              <div className="flex flex-col items-center text-center gap-2 py-10 px-4 text-slate-400" data-testid="chat-inbox-empty">
                <Inbox className="w-8 h-8" />
                <p className="text-sm">No hay conversaciones en esta vista.</p>
              </div>
            )}
            {!inboxLoading && items.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => select(c.id)}
                className={cn(
                  'w-full text-left px-3 py-3 border-b border-slate-100 hover:bg-slate-50 flex gap-3',
                  selectedId === c.id && 'bg-blue-50/60',
                )}
                data-testid="chat-inbox-item"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('truncate text-sm', c.unread > 0 ? 'font-black text-slate-900' : 'font-semibold text-slate-800')}>
                      {c.residentName}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-400">{formatChatTime(c.lastMessageAt ?? c.createdAt)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{c.unitLabel}</div>
                  <div className="text-xs text-slate-600 truncate mt-0.5">
                    {c.lastMessageAuthorRole === 'STAFF' && <span className="text-slate-400">Portería: </span>}
                    {c.lastMessagePreview ?? <em className="text-slate-400">Sin mensajes</em>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <StatusChip status={c.status} />
                    <span className="text-[10px] text-slate-500 truncate">
                      {c.status === 'ACTIVE' ? `Atiende: ${c.assignedToUserId === me ? 'tú' : c.assignedToName}` : c.status === 'PENDING' ? 'Sin asignar' : ''}
                    </span>
                  </div>
                </div>
                {c.unread > 0 && (
                  <span className="self-center shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center" data-testid="chat-unread">
                    {c.unread > 99 ? '99+' : c.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Conversación */}
        <section className={cn('min-h-0 flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden', !selectedId && 'hidden lg:flex')}>
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 p-6 text-center">
              <Inbox className="w-10 h-10" />
              <p className="text-sm">Selecciona una conversación de la bandeja.</p>
            </div>
          ) : (
            <>
              <header className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-2" data-testid="chat-header">
                <button type="button" onClick={() => select(null)} className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-slate-100" aria-label="Volver a la bandeja">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-slate-900 truncate">{selected.residentName}</div>
                  <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                    <span>{selected.unitLabel}</span> · <StatusChip status={selected.status} />
                    {selected.status === 'ACTIVE' && (
                      <span data-testid="chat-assignee">Atiende: {mine ? 'tú' : selected.assignedToName}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {!readOnly && selected.status === 'PENDING' && (
                    <ActionButton icon={<UserCheck className="w-4 h-4" />} label="Tomar" busy={busy === 'claim'}
                      onClick={() => act('claim', () => staffChatService.claim(selected.id), 'Conversación tomada')} testId="chat-claim" />
                  )}
                  {!readOnly && mine && (
                    <>
                      <ActionButton icon={<LogOut className="w-4 h-4" />} label="Liberar" busy={busy === 'release'}
                        onClick={() => act('release', () => staffChatService.release(selected.id), 'Conversación liberada')} testId="chat-release" />
                      <ActionButton icon={<Shuffle className="w-4 h-4" />} label="Transferir" busy={busy === 'transfer'}
                        onClick={() => void openTransfer()} testId="chat-transfer" />
                    </>
                  )}
                  {!readOnly && (mine || selected.status === 'PENDING') && (
                    <ActionButton icon={<CheckCircle2 className="w-4 h-4" />} label="Cerrar" busy={busy === 'close'}
                      onClick={() => act('close', () => staffChatService.close(selected.id), 'Conversación cerrada')} testId="chat-close" />
                  )}
                  <ActionButton icon={<History className="w-4 h-4" />} label="Historial" busy={false}
                    onClick={() => void openHistory()} testId="chat-history" />
                </div>
              </header>

              {showTransfer && mine && !readOnly && (
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50" data-testid="chat-transfer-panel">
                  <p className="text-xs font-bold text-slate-600 mb-1.5">Transferir a:</p>
                  {agents === null ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  ) : agents.filter((a) => a.userId !== me).length === 0 ? (
                    <p className="text-xs text-slate-500">No hay otros porteros activos.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {agents.filter((a) => a.userId !== me).map((a) => (
                        <button
                          key={a.userId}
                          type="button"
                          onClick={() => {
                            setShowTransfer(false);
                            void act('transfer', () => staffChatService.transfer(selected.id, a.userId), `Transferida a ${a.name}`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold hover:bg-slate-100"
                        >
                          {a.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {showHistory && (
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 max-h-40 overflow-y-auto" data-testid="chat-history-panel">
                  <ul className="space-y-1">
                    {history.map((e, i) => (
                      <li key={i} className="text-[11px] text-slate-600">
                        <span className="text-slate-400">{formatChatTime(e.at)}</span> · <strong>{EVENT_LABEL[e.type]}</strong>
                        {e.actorName && ` por ${e.actorName}`}
                        {e.type === 'TRANSFERRED' && e.toName && ` a ${e.toName}`}
                        {e.type === 'AUTO_RELEASED' && e.fromName && ` (${e.fromName})`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex-1 min-h-0">
                <ChatThread
                  messages={thread.messages}
                  viewerRole="STAFF"
                  showStaffNames
                  hasMore={thread.hasMore}
                  loading={thread.loading}
                  loadingOlder={thread.loadingOlder}
                  error={thread.error}
                  sendError={thread.sendError}
                  onLoadOlder={thread.loadOlder}
                  onSend={thread.send}
                  onRetry={thread.retry}
                  disabledReason={disabledReason}
                  notice={notice}
                  emptyText="Sin mensajes todavía. Escribe para iniciar la conversación."
                  placeholder="Responder al residente…"
                />
              </div>
            </>
          )}
        </section>
      </div>

      {showNew && !readOnly && (
        <NewConversationDialog
          onClose={() => setShowNew(false)}
          onStarted={(c) => {
            setShowNew(false);
            setItems((list) => upsertConversation(list, c));
            setSelected(c);
            select(c.id);
            scheduleRefetch();
          }}
        />
      )}
    </div>
  );
};

const StatusChip = ({ status }: { status: ChatConversation['status'] }) => (
  <span
    className={cn(
      'inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-md',
      status === 'PENDING' && 'bg-amber-100 text-amber-800',
      status === 'ACTIVE' && 'bg-emerald-100 text-emerald-800',
      status === 'CLOSED' && 'bg-slate-100 text-slate-500',
    )}
    data-testid="chat-status-chip"
  >
    {STATUS_LABEL_STAFF[status]}
  </span>
);

const ActionButton = ({ icon, label, busy, onClick, testId }: {
  icon: ReactNode; label: string; busy: boolean; onClick: () => void; testId: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={busy}
    title={label}
    className="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
    data-testid={testId}
  >
    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

/** Iniciar una conversación con un residente (con cuenta y relación activa con la unidad; lo valida el servidor). */
const NewConversationDialog = ({ onClose, onStarted }: { onClose: () => void; onStarted: (c: ChatConversation) => void }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ChatResidentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      staffChatService.residents(q.trim())
        .then((r) => !cancelled && setResults(r))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const start = async (o: ChatResidentOption) => {
    const key = `${o.residentUserId}:${o.propertyId}`;
    setStarting(key);
    try {
      onStarted(await staffChatService.start(o.propertyId, o.residentUserId));
    } catch (err) {
      notificationService.showToast(errorMessage(err, 'No se pudo iniciar la conversación.'), 'error');
    } finally {
      setStarting(null);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="chat-new-title" className="fixed inset-0 z-[100] bg-slate-900/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-4" onClick={(e) => e.stopPropagation()} data-testid="chat-new-dialog">
        <div className="flex items-center justify-between mb-3">
          <h2 id="chat-new-title" className="text-base font-black text-slate-900">Nueva conversación</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre del residente, torre o apartamento"
          aria-label="Buscar residente"
          className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#16345F]/30"
          data-testid="chat-new-search"
        />
        <ul className="mt-3 max-h-72 overflow-y-auto divide-y divide-slate-100">
          {loading && <li className="py-4 flex justify-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /></li>}
          {!loading && results.length === 0 && <li className="py-4 text-sm text-slate-400 text-center">Sin resultados.</li>}
          {!loading && results.map((o) => {
            const key = `${o.residentUserId}:${o.propertyId}`;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => void start(o)}
                  disabled={starting !== null}
                  className="w-full text-left py-2.5 px-1 hover:bg-slate-50 rounded-lg flex items-center justify-between gap-2"
                  data-testid="chat-new-option"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 truncate">{o.residentName}</span>
                    <span className="block text-[11px] text-slate-500 truncate">{o.unitLabel}</span>
                  </span>
                  {starting === key ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    : <span className="text-[11px] font-bold text-[#16345F]">{o.conversationId ? 'Abrir' : 'Escribir'}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
