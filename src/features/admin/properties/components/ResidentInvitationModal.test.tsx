import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const invitations = vi.hoisted(() => ({
  listInvitations: vi.fn(),
  generateInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
  regenerateInvitation: vi.fn(),
}));
const notify = vi.hoisted(() => ({ showToast: vi.fn(), showError: vi.fn(), showConfirm: vi.fn() }));

vi.mock('../../../../services/residentInvitationService', () => ({ residentInvitationService: invitations }));
vi.mock('../../../../services/notificationService', () => ({ notificationService: notify }));
vi.mock('../../../../contexts/TenantContext', () => ({ useTenant: () => ({ currentTenant: { id: 't-1', name: 'Comunidad' } }) }));
vi.mock('../../../../contexts/DataContext', () => ({ useData: () => ({ properties: [] }) }));

import { ResidentInvitationModal } from './ResidentInvitationModal';

const property = { id: '11111111-2222-3333-4444-555555555555', name: 'Apto 101', structureName: 'Torre 1' } as any;
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const inv = (over: Record<string, unknown> = {}) => ({
  id: 'inv-1', propertyId: property.id, propertyName: 'Apto 101', status: 'PENDING', invitationType: 'OWNER',
  maxUses: 1, usedCount: 0, expiresAt: hoursFromNow(20), createdAt: hoursFromNow(-4), ...over,
});
const NEW_LINK = 'http://c1.localhost:5173/register/invite/nuevo-token';

const renderModal = () => render(<ResidentInvitationModal isOpen onClose={() => {}} property={property} />);

let writeText: ReturnType<typeof vi.spyOn>;
/** user-event instala su propio portapapeles en setup(); se espía después para ver qué se copia. */
function setupUser() {
  const user = userEvent.setup();
  writeText = vi.spyOn(navigator.clipboard, 'writeText');
  return user;
}
beforeEach(() => {
  vi.clearAllMocks();
  notify.showConfirm.mockResolvedValue(true);
});
afterEach(() => cleanup());

describe('ResidentInvitationModal · invitación pendiente reabierta (TASK-011 #3)', () => {
  it('sin enlace no dibuja un QR vacío ni ofrece copiar: explica el motivo y no regenera al abrir', async () => {
    invitations.listInvitations.mockResolvedValue([inv()]);
    renderModal();
    expect(await screen.findByText('Invitacion Pendiente')).toBeTruthy();
    expect(screen.getByText(/el enlace solo se muestra al generarlo/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Generar nuevo enlace' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Copiar' })).toBeNull();
    expect(document.querySelector('svg[data-testid="invitation-qr"]')).toBeNull();
    expect(invitations.regenerateInvitation).not.toHaveBeenCalled();
    expect(invitations.generateInvitation).not.toHaveBeenCalled();
  });

  it('«Generar nuevo enlace» pide confirmación, regenera ESA invitación y muestra QR y copia con el enlace nuevo', async () => {
    invitations.listInvitations.mockResolvedValue([inv()]);
    invitations.regenerateInvitation.mockResolvedValue(inv({ id: 'inv-2', link: NEW_LINK, createdAt: new Date().toISOString() }));
    const user = setupUser();
    renderModal();
    await user.click(await screen.findByRole('button', { name: 'Generar nuevo enlace' }));

    expect(notify.showConfirm).toHaveBeenCalled();
    await waitFor(() => expect(invitations.regenerateInvitation).toHaveBeenCalledWith('inv-1'));
    const qr = await waitFor(() => document.querySelector('svg[data-testid="invitation-qr"]')!);
    expect(qr).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(writeText).toHaveBeenCalledWith(NEW_LINK);
    expect(notify.showToast).toHaveBeenCalledWith('Enlace copiado', 'success');
  });

  it('si se cancela la confirmación no regenera (el enlace ya compartido sigue valiendo)', async () => {
    invitations.listInvitations.mockResolvedValue([inv()]);
    notify.showConfirm.mockResolvedValue(false);
    const user = setupUser();
    renderModal();
    await user.click(await screen.findByRole('button', { name: 'Generar nuevo enlace' }));
    await waitFor(() => expect(notify.showConfirm).toHaveBeenCalled());
    expect(invitations.regenerateInvitation).not.toHaveBeenCalled();
  });

  it('solo considera la invitación de propietario vigente más reciente; ignora las de hogar y las vencidas', async () => {
    invitations.listInvitations.mockResolvedValue([
      inv({ id: 'hogar', invitationType: 'Arrendatario', createdAt: hoursFromNow(-1) }),
      inv({ id: 'vencida', expiresAt: hoursFromNow(-1), createdAt: hoursFromNow(-30) }),
      inv({ id: 'antigua', createdAt: hoursFromNow(-10) }),
      inv({ id: 'reciente', createdAt: hoursFromNow(-2) }),
    ]);
    const user = setupUser();
    invitations.regenerateInvitation.mockResolvedValue(inv({ id: 'nueva', link: NEW_LINK }));
    renderModal();
    await user.click(await screen.findByRole('button', { name: 'Generar nuevo enlace' }));
    await waitFor(() => expect(invitations.regenerateInvitation).toHaveBeenCalledWith('reciente'));
  });

  it('con solo invitaciones de hogar o vencidas ofrece generar una invitación nueva', async () => {
    invitations.listInvitations.mockResolvedValue([
      inv({ id: 'hogar', invitationType: 'Residente' }),
      inv({ id: 'vencida', expiresAt: hoursFromNow(-1) }),
    ]);
    renderModal();
    expect(await screen.findByRole('button', { name: /Generar Invitacion/ })).toBeTruthy();
    expect(screen.queryByText('Invitacion Pendiente')).toBeNull();
  });

  it('una invitación recién generada muestra su QR y su enlace sin regenerar', async () => {
    invitations.listInvitations.mockResolvedValue([]);
    invitations.generateInvitation.mockResolvedValue(inv({ id: 'inv-9', link: NEW_LINK }));
    const user = setupUser();
    renderModal();
    await user.click(await screen.findByRole('button', { name: /Generar Invitacion/ }));
    await waitFor(() => expect(document.querySelector('svg[data-testid="invitation-qr"]')).toBeTruthy());
    await user.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(writeText).toHaveBeenCalledWith(NEW_LINK);
    expect(invitations.regenerateInvitation).not.toHaveBeenCalled();
  });
});
