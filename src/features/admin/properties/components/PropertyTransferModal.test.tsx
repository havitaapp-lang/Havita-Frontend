import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({ post: vi.fn() }));
const notify = vi.hoisted(() => ({ showToast: vi.fn(), showError: vi.fn(), showConfirm: vi.fn() }));

vi.mock('../../../../api/apiClient', () => ({ apiClient: api }));
vi.mock('../../../../services/notificationService', () => ({ notificationService: notify }));

import { PropertyTransferModal } from './PropertyTransferModal';

const property = { id: 'p-101', name: 'Apto 101' } as any;
const renderModal = (onSuccess = vi.fn(), onClose = vi.fn()) =>
  render(<PropertyTransferModal property={property} onSuccess={onSuccess} onClose={onClose} />);

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('PropertyTransferModal · destinatario (SEC-8)', () => {
  it('el correo del nuevo propietario es obligatorio: sin él no se envía la transferencia', async () => {
    const user = userEvent.setup();
    renderModal();
    const email = screen.getByLabelText('Email *') as HTMLInputElement;
    expect(email.required).toBe(true);
    expect(email.type).toBe('email');

    await user.type(screen.getByText('Nombre del nuevo Propietario *').parentElement!.querySelector('input')!, 'Nuevo Propietario');
    await user.click(screen.getByRole('button', { name: /Confirmar Transferencia/ }));
    expect(api.post).not.toHaveBeenCalled();
  });

  it('envía el correo como único destinatario y muestra el enlace devuelto', async () => {
    api.post.mockResolvedValue({ inviteLink: 'http://c1.localhost:5173/register/invite/nuevo', linkedUserId: null });
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByText('Nombre del nuevo Propietario *').parentElement!.querySelector('input')!, 'Nuevo Propietario');
    await user.type(screen.getByLabelText('Email *'), 'nuevo@example.test');
    await user.click(screen.getByRole('button', { name: /Confirmar Transferencia/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const [url, payload] = api.post.mock.calls[0];
    expect(url).toBe('/properties/p-101/transfer-owner');
    expect(payload).toMatchObject({ newOwnerName: 'Nuevo Propietario', newOwnerEmail: 'nuevo@example.test' });
    expect(payload.newOwnerUserId).toBeUndefined();
    expect(await screen.findByText('¡Transferencia Exitosa!')).toBeTruthy();
  });
});
