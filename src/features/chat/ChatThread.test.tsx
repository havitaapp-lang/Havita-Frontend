/**
 * Fase 3 — hilo de chat: texto plano (sin HTML ejecutable), envío con Enter, reintento, estados de carga y error.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatThread } from './ChatThread';
import type { ChatMessage } from './chatTypes';

afterEach(() => cleanup());

const m = (seq: number, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: `m${seq}`, conversationId: 'c1', seq, authorRole: 'RESIDENT', authorUserId: 'u1', authorName: 'Ana Residente',
  body: `mensaje ${seq}`, createdAt: '2026-11-13T10:00:00Z', clientMessageId: null, ...extra,
});

const base = {
  hasMore: false, loading: false, loadingOlder: false, onLoadOlder: vi.fn(), onRetry: vi.fn(),
  onSend: vi.fn().mockResolvedValue(true),
};

describe('ChatThread', () => {
  it('muestra el HTML de un mensaje como texto (no crea elementos)', () => {
    const { container } = render(
      <ChatThread {...base} viewerRole="STAFF" messages={[m(1, { body: '<img src=x onerror=alert(1)><b>hola</b>' })]} />,
    );
    expect(screen.getByTestId('chat-message-body').textContent).toBe('<img src=x onerror=alert(1)><b>hola</b>');
    expect(container.querySelector('[data-testid="chat-messages"] img')).toBeNull();
    expect(container.querySelector('[data-testid="chat-messages"] b')).toBeNull();
  });

  it('Enter envía; Shift+Enter no; no se envía vacío', async () => {
    const onSend = vi.fn().mockResolvedValue(true);
    render(<ChatThread {...base} onSend={onSend} viewerRole="RESIDENT" messages={[]} />);
    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'línea' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    await vi.waitFor(() => expect(onSend).toHaveBeenCalledWith('línea'));
  });

  it('limita a 1000 caracteres', () => {
    render(<ChatThread {...base} viewerRole="RESIDENT" messages={[]} />);
    const input = screen.getByTestId('chat-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'x'.repeat(1200) } });
    expect(input.value).toHaveLength(1000);
    expect(screen.getByText(/0 caracteres disponibles/)).toBeTruthy();
  });

  it('mensaje fallido: botón Reintentar con su clientMessageId', () => {
    const onRetry = vi.fn();
    render(<ChatThread {...base} onRetry={onRetry} viewerRole="RESIDENT"
      messages={[m(9e15, { id: 'local-x', clientMessageId: 'cid-x', localState: 'failed' })]} />);
    fireEvent.click(screen.getByTestId('chat-retry'));
    expect(onRetry).toHaveBeenCalledWith('cid-x');
  });

  it('sin permiso para escribir: muestra el motivo y no el campo', () => {
    render(<ChatThread {...base} viewerRole="STAFF" messages={[]} disabledReason="La atiende Portero Uno." />);
    expect(screen.getByTestId('chat-disabled').textContent).toContain('Portero Uno');
    expect(screen.queryByTestId('chat-input')).toBeNull();
  });

  it('los mensajes del personal muestran «Nombre · Portería» (también al residente)', () => {
    render(<ChatThread {...base} viewerRole="RESIDENT"
      messages={[m(1, { authorRole: 'STAFF', authorName: 'Portero Dos' }), m(2, { authorRole: 'STAFF', authorName: 'Portería' })]} />);
    expect(screen.getAllByTestId('chat-message-author').map((n) => n.textContent)).toEqual(['Portero Dos · Portería', 'Portería']);
  });

  it('estados de carga, vacío y error; cargar anteriores', () => {
    const onLoadOlder = vi.fn();
    const { rerender } = render(<ChatThread {...base} viewerRole="RESIDENT" messages={[]} loading />);
    expect(screen.getByTestId('chat-loading')).toBeTruthy();
    rerender(<ChatThread {...base} viewerRole="RESIDENT" messages={[]} />);
    expect(screen.getByTestId('chat-empty')).toBeTruthy();
    rerender(<ChatThread {...base} viewerRole="RESIDENT" messages={[]} error="No se pudo cargar." />);
    expect(screen.getByRole('alert').textContent).toContain('No se pudo cargar.');
    rerender(<ChatThread {...base} onLoadOlder={onLoadOlder} viewerRole="RESIDENT" messages={[m(5)]} hasMore />);
    fireEvent.click(screen.getByText('Cargar mensajes anteriores'));
    expect(onLoadOlder).toHaveBeenCalled();
  });
});
