/**
 * Fase 3 — aviso del chat para activar las notificaciones en este dispositivo (sin ellas no llegan los avisos con el
 * celular bloqueado).
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.hoisted(() => ({
  isSupported: vi.fn(), getPermission: vi.fn(), isBrowserSubscribed: vi.fn(), subscribe: vi.fn(),
}));
vi.mock('../../services/pushNotificationService', () => ({ pushNotificationService: push }));

import { ChatPushPrompt } from './ChatPushPrompt';

beforeEach(() => {
  Object.values(push).forEach((f) => f.mockReset());
  sessionStorage.clear();
  push.isSupported.mockReturnValue(true);
  push.getPermission.mockReturnValue('default');
  push.isBrowserSubscribed.mockResolvedValue(false);
});
afterEach(() => cleanup());

describe('ChatPushPrompt', () => {
  it('sin suscripción: ofrece activarlas y desaparece al activarlas', async () => {
    push.subscribe.mockResolvedValue({ success: true });
    render(<ChatPushPrompt who="resident" />);
    await screen.findByTestId('chat-push-prompt');
    fireEvent.click(screen.getByTestId('chat-push-enable'));
    await waitFor(() => expect(screen.queryByTestId('chat-push-prompt')).toBeNull());
    expect(push.subscribe).toHaveBeenCalledTimes(1);
  });

  it('ya suscrito con permiso concedido: no muestra nada', async () => {
    push.getPermission.mockReturnValue('granted');
    push.isBrowserSubscribed.mockResolvedValue(true);
    render(<ChatPushPrompt who="resident" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('chat-push-prompt')).toBeNull();
  });

  it('permiso concedido pero sin suscripción (p. ej. tras cerrar sesión): vuelve a ofrecerlo', async () => {
    push.getPermission.mockReturnValue('granted');
    render(<ChatPushPrompt who="staff" />);
    expect((await screen.findByTestId('chat-push-prompt')).textContent).toContain('mensajes de los residentes');
  });

  it('bloqueadas: explica cómo permitirlas en los ajustes', async () => {
    push.getPermission.mockReturnValue('denied');
    render(<ChatPushPrompt who="resident" />);
    expect((await screen.findByTestId('chat-push-prompt')).textContent).toContain('bloqueadas');
    expect(screen.queryByTestId('chat-push-enable')).toBeNull();
  });

  it('navegador sin push (Safari sin instalar la app): no muestra nada', async () => {
    push.isSupported.mockReturnValue(false);
    render(<ChatPushPrompt who="resident" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('chat-push-prompt')).toBeNull();
  });
});
