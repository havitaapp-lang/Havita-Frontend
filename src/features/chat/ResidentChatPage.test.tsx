/**
 * Fase 3 — chat del residente: carga, tiempo real (SSE), recuperación tras desconexión y huecos, envío optimista con
 * reintento idempotente, lectura, estados de carga y error.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatConversation, ChatMessage } from './chatTypes';

const svc = vi.hoisted(() => ({
  list: vi.fn(), send: vi.fn(), messages: vi.fn(), read: vi.fn(),
}));
vi.mock('./chatService', () => ({ residentChatService: svc, staffChatService: {} }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Ana Residente', role: 'RESIDENT' } }) }));
vi.mock('../../hooks/useActiveUnit', () => ({ useActiveUnit: () => ({ activeUnitId: 'p1', activeLabel: 'Torre 1 · 101' }) }));

import { ResidentChatPage } from './ResidentChatPage';

const conv = (extra: Partial<ChatConversation> = {}): ChatConversation => ({
  id: 'c1', status: 'ACTIVE', propertyId: 'p1', unitLabel: 'Torre 1 · 101', residentUserId: 'u1', residentName: 'Ana',
  assignedToUserId: null, assignedToName: null, assignedAt: null, attended: true, lastMessageSeq: 2,
  lastMessageAt: '2026-11-13T10:00:00Z', lastMessagePreview: 'hola', lastMessageAuthorRole: 'STAFF', unread: 0,
  readSeq: 2, createdAt: '2026-11-13T09:00:00Z', closedAt: null, ...extra,
});
const msg = (seq: number, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: `m${seq}`, conversationId: 'c1', seq, authorRole: seq % 2 ? 'RESIDENT' : 'STAFF', authorUserId: null,
  authorName: seq % 2 ? 'Ana' : 'Portería', body: `mensaje ${seq}`, createdAt: '2026-11-13T10:00:00Z',
  clientMessageId: null, ...extra,
});

const sse = (type: string, payload: unknown) =>
  act(() => { window.dispatchEvent(new CustomEvent(type, { detail: payload })); });

beforeEach(() => {
  Object.values(svc).forEach((f) => f.mockReset());
  svc.list.mockResolvedValue([conv()]);
  svc.messages.mockResolvedValue({ messages: [msg(1), msg(2)], hasMore: false, conversation: conv() });
  svc.read.mockImplementation(async (_id: string, seq: number) => conv({ readSeq: seq, unread: 0 }));
});
afterEach(() => cleanup());

const bodies = () => screen.queryAllByTestId('chat-message-body').map((n) => n.textContent);

describe('ResidentChatPage', () => {
  it('carga el hilo de la unidad activa y muestra el estado de atención', async () => {
    render(<ResidentChatPage />);
    await waitFor(() => expect(bodies()).toEqual(['mensaje 1', 'mensaje 2']));
    expect(screen.getByTestId('chat-status').textContent).toContain('Portería te está atendiendo');
  });

  it('muestra el nombre del portero que le atiende', async () => {
    svc.list.mockResolvedValue([conv({ assignedToName: 'Pedro Portero' })]);
    render(<ResidentChatPage />);
    await waitFor(() => expect(screen.getByTestId('chat-status').textContent).toBe('Te atiende Pedro Portero · Portería'));
    expect(svc.messages).toHaveBeenCalledWith('c1', { size: 30 });
  });

  it('SSE: un mensaje nuevo aparece sin recargar y se marca como leído', async () => {
    render(<ResidentChatPage />);
    await waitFor(() => expect(bodies()).toHaveLength(2));
    sse('CHAT_MESSAGE', { conversation: conv({ lastMessageSeq: 3, unread: 1 }), message: msg(3, { authorRole: 'STAFF', body: 'Tu paquete llegó' }) });
    expect(bodies()).toContain('Tu paquete llegó');
    await waitFor(() => expect(svc.read).toHaveBeenCalledWith('c1', 3), { timeout: 2000 });
  });

  it('hueco en seq (mensaje perdido): recupera con after', async () => {
    render(<ResidentChatPage />);
    await waitFor(() => expect(bodies()).toHaveLength(2));
    svc.messages.mockResolvedValueOnce({ messages: [msg(3), msg(4), msg(5)], hasMore: false, conversation: conv({ lastMessageSeq: 5 }) });
    sse('CHAT_MESSAGE', { conversation: conv({ lastMessageSeq: 5 }), message: msg(5) });
    await waitFor(() => expect(svc.messages).toHaveBeenCalledWith('c1', { after: 2, size: 100 }));
    await waitFor(() => expect(bodies()).toEqual(['mensaje 1', 'mensaje 2', 'mensaje 3', 'mensaje 4', 'mensaje 5']));
  });

  it('reconexión del SSE: vuelve a pedir la lista y lo perdido desde el último seq', async () => {
    render(<ResidentChatPage />);
    await waitFor(() => expect(bodies()).toHaveLength(2));
    svc.messages.mockResolvedValueOnce({ messages: [msg(3)], hasMore: false, conversation: conv({ lastMessageSeq: 3 }) });
    act(() => { window.dispatchEvent(new Event('havita:sse-open')); });
    await waitFor(() => expect(svc.messages).toHaveBeenCalledWith('c1', { after: 2, size: 100 }));
    await waitFor(() => expect(bodies()).toContain('mensaje 3'));
    expect(svc.list).toHaveBeenCalledTimes(2);
  });

  it('envío optimista; si falla se reintenta con el MISMO clientMessageId', async () => {
    render(<ResidentChatPage />);
    await waitFor(() => expect(bodies()).toHaveLength(2));
    svc.send.mockRejectedValueOnce(Object.assign(new Error('offline'), { status: 0 }));
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Hola portería' } });
    fireEvent.click(screen.getByTestId('chat-send'));
    await waitFor(() => expect(screen.getByTestId('chat-retry')).toBeTruthy());
    expect(bodies()).toContain('Hola portería');
    const [, firstClientId, unit] = svc.send.mock.calls[0];
    expect(unit).toBe('p1');

    svc.send.mockResolvedValueOnce({
      duplicate: false, conversation: conv({ lastMessageSeq: 3 }),
      message: msg(3, { body: 'Hola portería', clientMessageId: firstClientId }),
    });
    fireEvent.click(screen.getByTestId('chat-retry'));
    await waitFor(() => expect(screen.queryByTestId('chat-retry')).toBeNull());
    expect(svc.send.mock.calls[1][1]).toBe(firstClientId);
    expect(bodies().filter((b) => b === 'Hola portería')).toHaveLength(1);
  });

  it('sin conversación todavía: estado vacío y el primer mensaje la crea', async () => {
    svc.list.mockResolvedValue([]);
    render(<ResidentChatPage />);
    await waitFor(() => expect(screen.getByTestId('chat-empty')).toBeTruthy());
    svc.send.mockImplementation(async (body: string, cid: string) => ({
      duplicate: false, conversation: conv({ status: 'PENDING', lastMessageSeq: 1, readSeq: 1 }),
      message: msg(1, { body, clientMessageId: cid }),
    }));
    svc.messages.mockResolvedValue({ messages: [msg(1, { body: 'Primera' })], hasMore: false, conversation: conv({ status: 'PENDING', lastMessageSeq: 1, readSeq: 1 }) });
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Primera' } });
    fireEvent.click(screen.getByTestId('chat-send'));
    await waitFor(() => expect(screen.getByTestId('chat-status').textContent).toContain('Esperando a portería'));
    expect(bodies()).toEqual(['Primera']);
  });

  it('error al cargar: mensaje y reintento', async () => {
    svc.list.mockRejectedValueOnce(new Error('500'));
    render(<ResidentChatPage />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('No se pudo cargar'));
    fireEvent.click(screen.getByText('Reintentar'));
    await waitFor(() => expect(bodies()).toHaveLength(2));
  });
});
