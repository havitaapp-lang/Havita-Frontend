/**
 * Fase 3 — estado del chat: los mensajes llegan por el POST, por SSE y por la recuperación tras desconexión, en
 * cualquier orden. Nunca deben duplicarse ni desordenarse.
 */
import { describe, expect, it } from 'vitest';
import {
  confirmMessage, formatChatTime, staffLabel, hasGap, lastServerSeq, markFailed, mergeMessages, sortConversations, upsertConversation,
} from './chatState';
import type { ChatConversation, ChatMessage } from './chatTypes';

const msg = (seq: number, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: `m${seq}`, conversationId: 'c1', seq, authorRole: 'RESIDENT', authorUserId: 'u1', authorName: 'Ana',
  body: `texto ${seq}`, createdAt: '2026-11-13T10:00:00Z', clientMessageId: null, ...extra,
});

const pending = (cid: string): ChatMessage => ({
  ...msg(Number.MAX_SAFE_INTEGER), id: `local-${cid}`, clientMessageId: cid, localState: 'sending',
});

const conv = (id: string, at: string): ChatConversation => ({
  id, status: 'PENDING', propertyId: 'p', unitLabel: 'T1 · 101', residentUserId: 'u', residentName: 'Ana',
  assignedToUserId: null, assignedToName: null, assignedAt: null, attended: false, lastMessageSeq: 1, lastMessageAt: at,
  lastMessagePreview: 'x', lastMessageAuthorRole: 'RESIDENT', unread: 0, readSeq: 0, createdAt: at, closedAt: null,
});

describe('mergeMessages', () => {
  it('sin duplicados y en orden de seq aunque lleguen desordenados', () => {
    const out = mergeMessages([msg(1), msg(3)], [msg(2), msg(3), msg(4)]);
    expect(out.map((m) => m.seq)).toEqual([1, 2, 3, 4]);
  });

  it('el SSE llega antes que la respuesta del POST: un solo mensaje al final', () => {
    let list = [msg(1), pending('cid-1')];
    list = mergeMessages(list, [msg(2)]); // SSE (sin clientMessageId)
    expect(list).toHaveLength(3); // aún se ve el pendiente
    list = confirmMessage(list, 'cid-1', msg(2, { clientMessageId: 'cid-1' })); // respuesta del POST
    expect(list.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(list.some((m) => m.localState)).toBe(false);
  });

  it('la respuesta del POST antes que el SSE: tampoco duplica', () => {
    let list = confirmMessage([msg(1), pending('cid-2')], 'cid-2', msg(2, { clientMessageId: 'cid-2' }));
    list = mergeMessages(list, [msg(2)]);
    expect(list.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('los pendientes quedan al final y un fallo se marca para reintentar', () => {
    const list = markFailed(mergeMessages([pending('cid-3')], [msg(1)]), 'cid-3');
    expect(list.map((m) => m.id)).toEqual(['m1', 'local-cid-3']);
    expect(list[1].localState).toBe('failed');
    expect(lastServerSeq(list)).toBe(1);
  });
});

describe('hasGap', () => {
  it('detecta mensajes perdidos (salto de seq) para recuperarlos con after', () => {
    expect(hasGap([msg(1), msg(2)], msg(3))).toBe(false);
    expect(hasGap([msg(1), msg(2)], msg(5))).toBe(true);
    expect(hasGap([], msg(7))).toBe(false); // hilo aún no cargado
  });
});

describe('conversaciones', () => {
  it('upsert reemplaza y ordena por actividad reciente', () => {
    const list = sortConversations([conv('a', '2026-11-13T10:00:00Z'), conv('b', '2026-11-13T11:00:00Z')]);
    expect(list.map((c) => c.id)).toEqual(['b', 'a']);
    const updated = upsertConversation(list, conv('a', '2026-11-13T12:00:00Z'));
    expect(updated.map((c) => c.id)).toEqual(['a', 'b']);
    expect(updated).toHaveLength(2);
  });
});

describe('staffLabel', () => {
  it('nombre del portero junto a «Portería»', () => {
    expect(staffLabel('Ana Portera')).toBe('Ana Portera · Portería');
    expect(staffLabel('')).toBe('Portería');
    expect(staffLabel(null)).toBe('Portería');
    expect(staffLabel('Portería')).toBe('Portería');
  });
});

describe('formatChatTime', () => {
  const now = new Date('2026-11-13T15:00:00');
  it('hoy solo la hora; ayer y otros días con fecha', () => {
    expect(formatChatTime('2026-11-13T09:05:00', now)).not.toMatch(/ayer|nov/);
    expect(formatChatTime('2026-11-12T09:05:00', now)).toMatch(/^ayer /);
    expect(formatChatTime('2026-11-01T09:05:00', now)).toMatch(/nov/);
    expect(formatChatTime(null, now)).toBe('');
  });
});
