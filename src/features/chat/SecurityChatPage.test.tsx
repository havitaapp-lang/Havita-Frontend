/**
 * Fase 3 — bandeja compartida de portería: lista con no leídos y responsable, filtros y búsqueda, tomar, responder solo
 * el responsable, transferir, tiempo real, enlace directo (?c=) e inicio de conversación.
 */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatConversation, ChatMessage } from './chatTypes';

const svc = vi.hoisted(() => ({
  inbox: vi.fn(), get: vi.fn(), start: vi.fn(), messages: vi.fn(), events: vi.fn(), send: vi.fn(), claim: vi.fn(),
  release: vi.fn(), transfer: vi.fn(), close: vi.fn(), read: vi.fn(), agents: vi.fn(), residents: vi.fn(),
}));
vi.mock('./chatService', () => ({ staffChatService: svc, residentChatService: {} }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'g1', name: 'Portero Uno', role: 'SECURITY' } }) }));
vi.mock('../../services/notificationService', () => ({ notificationService: { showToast: vi.fn() } }));

import { SecurityChatPage } from './SecurityChatPage';

const conv = (id: string, extra: Partial<ChatConversation> = {}): ChatConversation => ({
  id, status: 'PENDING', propertyId: `p-${id}`, unitLabel: `Torre 1 · ${id}`, residentUserId: `r-${id}`,
  residentName: `Residente ${id}`, assignedToUserId: null, assignedToName: null, assignedAt: null, attended: false,
  lastMessageSeq: 1, lastMessageAt: '2026-11-13T10:00:00Z', lastMessagePreview: `hola ${id}`,
  lastMessageAuthorRole: 'RESIDENT', unread: 1, readSeq: 0, createdAt: '2026-11-13T09:00:00Z', closedAt: null, ...extra,
});
const msg = (cid: string, seq: number, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: `${cid}-m${seq}`, conversationId: cid, seq, authorRole: 'RESIDENT', authorUserId: `r-${cid}`,
  authorName: `Residente ${cid}`, body: `mensaje ${seq}`, createdAt: '2026-11-13T10:00:00Z', clientMessageId: null, ...extra,
});
const page = (items: ChatConversation[]) => ({ content: items, totalElements: items.length, totalPages: 1, number: 0 });

let inbox: ChatConversation[];

beforeEach(() => {
  Object.values(svc).forEach((f) => f.mockReset());
  inbox = [
    conv('101'),
    conv('202', { status: 'ACTIVE', assignedToUserId: 'g2', assignedToName: 'Portero Dos', unread: 0, attended: true }),
    conv('303', { status: 'ACTIVE', assignedToUserId: 'g1', assignedToName: 'Portero Uno', unread: 2, attended: true }),
  ];
  svc.inbox.mockImplementation(async () => page(inbox));
  svc.get.mockImplementation(async (id: string) => inbox.find((c) => c.id === id) ?? conv(id));
  svc.messages.mockImplementation(async (id: string) => ({
    messages: [msg(id, 1)], hasMore: false, conversation: inbox.find((c) => c.id === id) ?? conv(id),
  }));
  svc.read.mockImplementation(async (id: string, seq: number) => ({ ...(inbox.find((c) => c.id === id) ?? conv(id)), readSeq: seq, unread: 0 }));
  svc.agents.mockResolvedValue([{ userId: 'g1', name: 'Portero Uno' }, { userId: 'g2', name: 'Portero Dos' }]);
});
afterEach(() => cleanup());

const renderAt = (path = '/security/chat') =>
  render(<MemoryRouter initialEntries={[path]}><SecurityChatPage /></MemoryRouter>);
const items = () => screen.getAllByTestId('chat-inbox-item');
const item = (name: string) => items().find((n) => n.textContent?.includes(name))!;

describe('SecurityChatPage', () => {
  it('bandeja: residente, unidad, no leídos, estado y quién atiende', async () => {
    renderAt();
    await waitFor(() => expect(items()).toHaveLength(3));
    expect(item('Residente 101').textContent).toContain('Sin asignar');
    expect(within(item('Residente 101')).getByTestId('chat-unread').textContent).toBe('1');
    expect(item('Residente 202').textContent).toContain('Atiende: Portero Dos');
    expect(item('Residente 303').textContent).toContain('Atiende: tú');
    expect(svc.inbox).toHaveBeenCalledWith('OPEN', '');
  });

  it('filtros y búsqueda por residente o unidad', async () => {
    renderAt();
    await waitFor(() => expect(items()).toHaveLength(3));
    fireEvent.click(screen.getByTestId('chat-filter-PENDING'));
    await waitFor(() => expect(svc.inbox).toHaveBeenCalledWith('PENDING', ''));
    fireEvent.change(screen.getByTestId('chat-search'), { target: { value: 'Torre 1 · 202' } });
    await waitFor(() => expect(svc.inbox).toHaveBeenCalledWith('PENDING', 'Torre 1 · 202'), { timeout: 2000 });
  });

  it('pendiente: se puede tomar; queda «Atiende: tú»', async () => {
    svc.claim.mockImplementation(async () => conv('101', { status: 'ACTIVE', assignedToUserId: 'g1', assignedToName: 'Portero Uno', attended: true }));
    renderAt();
    await waitFor(() => expect(items()).toHaveLength(3));
    fireEvent.click(item('Residente 101'));
    await waitFor(() => expect(screen.getByTestId('chat-claim')).toBeTruthy());
    expect(screen.getByText(/al responder, la conversación quedará a tu cargo/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('chat-claim'));
    await waitFor(() => expect(screen.getByTestId('chat-assignee').textContent).toBe('Atiende: tú'));
    expect(svc.claim).toHaveBeenCalledWith('101');
    expect(screen.queryByTestId('chat-claim')).toBeNull();
    expect(screen.getByTestId('chat-release')).toBeTruthy();
  });

  it('atendida por otro portero: puede verla pero no responder ni operar', async () => {
    renderAt();
    await waitFor(() => expect(items()).toHaveLength(3));
    fireEvent.click(item('Residente 202'));
    await waitFor(() => expect(screen.getByTestId('chat-disabled').textContent).toContain('La atiende Portero Dos'));
    expect(screen.queryByTestId('chat-input')).toBeNull();
    for (const id of ['chat-claim', 'chat-release', 'chat-transfer', 'chat-close']) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
    expect(screen.getByTestId('chat-history')).toBeTruthy();
  });

  it('propia: transferir lista a los demás porteros (no a sí mismo)', async () => {
    svc.transfer.mockImplementation(async () => conv('303', { status: 'ACTIVE', assignedToUserId: 'g2', assignedToName: 'Portero Dos', attended: true }));
    renderAt();
    await waitFor(() => expect(items()).toHaveLength(3));
    fireEvent.click(item('Residente 303'));
    await waitFor(() => expect(screen.getByTestId('chat-transfer')).toBeTruthy());
    fireEvent.click(screen.getByTestId('chat-transfer'));
    const panel = await screen.findByTestId('chat-transfer-panel');
    await waitFor(() => expect(within(panel).getByText('Portero Dos')).toBeTruthy());
    expect(within(panel).queryByText('Portero Uno')).toBeNull();
    fireEvent.click(within(panel).getByText('Portero Dos'));
    await waitFor(() => expect(svc.transfer).toHaveBeenCalledWith('303', 'g2'));
    await waitFor(() => expect(screen.getByTestId('chat-disabled').textContent).toContain('Portero Dos'));
  });

  it('tiempo real: mensaje en la conversación abierta y no leídos en la bandeja', async () => {
    renderAt('/security/chat?c=303');
    await waitFor(() => expect(screen.getAllByTestId('chat-message-body')).toHaveLength(1));
    act(() => {
      window.dispatchEvent(new CustomEvent('CHAT_MESSAGE', {
        detail: { conversation: { ...inbox[2], lastMessageSeq: 2, unread: 1 }, message: msg('303', 2, { body: 'Llegó el domicilio?' }) },
      }));
      window.dispatchEvent(new CustomEvent('CHAT_MESSAGE', {
        detail: { conversation: { ...inbox[0], lastMessageSeq: 2, unread: 2, lastMessagePreview: 'urgente' }, message: msg('101', 2) },
      }));
    });
    expect(screen.getAllByTestId('chat-message-body').map((n) => n.textContent)).toEqual(['mensaje 1', 'Llegó el domicilio?']);
    expect(within(item('Residente 101')).getByTestId('chat-unread').textContent).toBe('2');
    expect(item('Residente 101').textContent).toContain('urgente');
    // Es la conversación propia y está visible: se marca como leída.
    await waitFor(() => expect(svc.read).toHaveBeenCalledWith('303', 2), { timeout: 2000 });
  });

  it('nueva conversación: busca residentes y la inicia', async () => {
    svc.residents.mockResolvedValue([
      { residentUserId: 'r9', residentName: 'Carlos Vecino', propertyId: 'p9', unitLabel: 'Torre 2 · 909', conversationId: null },
    ]);
    svc.start.mockResolvedValue(conv('909', { residentName: 'Carlos Vecino', status: 'ACTIVE', assignedToUserId: 'g1', assignedToName: 'Portero Uno' }));
    renderAt();
    await waitFor(() => expect(items()).toHaveLength(3));
    fireEvent.click(screen.getByTestId('chat-new'));
    fireEvent.change(screen.getByTestId('chat-new-search'), { target: { value: '909' } });
    const option = await screen.findByTestId('chat-new-option', undefined, { timeout: 2000 });
    expect(svc.residents).toHaveBeenLastCalledWith('909');
    fireEvent.click(option);
    await waitFor(() => expect(svc.start).toHaveBeenCalledWith('p9', 'r9'));
    await waitFor(() => expect(screen.getByTestId('chat-header').textContent).toContain('Carlos Vecino'));
    expect(screen.queryByTestId('chat-new-dialog')).toBeNull();
  });

  it('administración (solo lectura): ve bandeja, mensajes e historial, pero no opera ni escribe', async () => {
    svc.events.mockResolvedValue([{ type: 'CLAIMED', actorName: 'Portero Uno', fromName: null, toName: 'Portero Uno', at: '2026-11-13T10:00:00Z' }]);
    render(<MemoryRouter initialEntries={['/admin/chat']}><SecurityChatPage readOnly /></MemoryRouter>);
    await waitFor(() => expect(items()).toHaveLength(3));
    expect(screen.getByText('Chat de portería')).toBeTruthy();
    expect(screen.queryByTestId('chat-new')).toBeNull();
    for (const name of ['Residente 101', 'Residente 303']) {
      fireEvent.click(item(name));
      await waitFor(() => expect(screen.getByTestId('chat-header').textContent).toContain(name));
      for (const id of ['chat-claim', 'chat-release', 'chat-transfer', 'chat-close', 'chat-input']) {
        expect(screen.queryByTestId(id)).toBeNull();
      }
      expect(screen.getByTestId('chat-disabled').textContent).toContain('solo lectura');
    }
    await waitFor(() => expect(screen.getAllByTestId('chat-message-body')).toHaveLength(1));
    fireEvent.click(screen.getByTestId('chat-history'));
    await waitFor(() => expect(screen.getByTestId('chat-history-panel').textContent).toContain('Tomada'));
    await new Promise((r) => setTimeout(r, 700));
    expect(svc.read).not.toHaveBeenCalled(); // no marca como leído en nombre de portería
  });

  it('bandeja vacía y error con reintento', async () => {
    svc.inbox.mockRejectedValueOnce(new Error('500'));
    renderAt();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('No se pudo cargar la bandeja'));
    inbox = [];
    fireEvent.click(screen.getByText('Reintentar'));
    await waitFor(() => expect(screen.getByTestId('chat-inbox-empty')).toBeTruthy());
  });
});
