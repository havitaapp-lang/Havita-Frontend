import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiError } from '../../../api/apiClient';

const svc = vi.hoisted(() => ({
  history: vi.fn(), voidParticipation: vi.fn(), assistedVote: vi.fn(), limit: vi.fn(), setLimit: vi.fn(), limitHistory: vi.fn(),
  mine: vi.fn(), revoke: vi.fn(), attendSelf: vi.fn(), proxyVote: vi.fn(), request: vi.fn(), downloadDocument: vi.fn(),
}));
const notify = vi.hoisted(() => ({
  showToast: vi.fn(), showError: vi.fn(), showConfirm: vi.fn(async () => true), showPrompt: vi.fn(async () => 'Error de digitación'),
}));
const assemblies = vi.hoisted(() => ({ getAssemblies: vi.fn(), getMyAttendanceUnits: vi.fn() }));
const polls = vi.hoisted(() => ({ getPolls: vi.fn() }));
vi.mock('./proxyService', async (orig) => ({ ...(await orig<object>()), proxyService: svc }));
vi.mock('../../../services/notificationService', () => ({ notificationService: notify }));
vi.mock('../services/assemblyService', () => ({ assemblyService: assemblies }));
vi.mock('../services/pollService', () => ({ pollService: polls }));

import { ProxyRequestForm } from './components/ProxyRequestForm';
import { ParticipationHistory } from './components/ParticipationHistory';
import { AssistedVotePanel } from './components/AssistedVotePanel';
import { ProxyLimitSettings } from './components/ProxyLimitSettings';
import { ResidentProxiesPage } from './pages/ResidentProxiesPage';
import type { AssemblyProxy, ParticipationAudit } from './proxyTypes';

const wrap = (ui: ReactNode) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>,
);
beforeEach(() => {
  Object.values(svc).forEach((f) => f.mockReset());
  notify.showConfirm.mockResolvedValue(true);
  notify.showPrompt.mockResolvedValue('Error de digitación');
});
afterEach(() => cleanup());

const proxy = (over: Partial<AssemblyProxy>): AssemblyProxy => ({
  id: 'PX1', assemblyId: 'A1', propertyId: 'U1', grantorResidentId: 'R1', proxyUserId: null, proxyFullName: 'Laura Gómez',
  proxyDocumentType: 'CC', proxyDocumentNumber: '1010', status: 'USED', createdChannel: 'OWNER', documentContentType: 'application/pdf',
  documentSizeBytes: 10, documentRegisteredAt: null, reviewedAt: null, reviewDecision: null, rejectionReason: null,
  revokedAt: null, expiredAt: null, createdAt: '2026-11-11T10:00:00Z', propertyNumber: '101', ...over,
});
const livePoll = {
  id: 'Q1', question: '¿Aprueba la obra?', status: 'LIVE', type: 'SINGLE_CHOICE',
  options: [{ id: 'O1', text: 'Sí' }, { id: 'O2', text: 'No' }],
} as never;

// Los campos se rellenan con un evento (clic + pegar), no tecla a tecla: ver la estabilización de ResidentsPage.test.tsx.
describe('ProxyRequestForm (P6-B)', () => {
  it('valida campos y archivo antes de enviar, y envía una sola vez los datos del apoderado externo', async () => {
    // El envio queda PENDIENTE hasta despues del segundo clic: la proteccion contra doble envio se comprueba sin
    // depender de tiempos (antes se resolvia a los 50 ms y, con la maquina cargada, el segundo clic llegaba tarde).
    let finish!: () => void;
    const onSubmit = vi.fn((_data: unknown, _file: File) => new Promise<void>((r) => { finish = r; }));
    const user = userEvent.setup();
    render(<ProxyRequestForm units={[{ propertyId: 'U1', label: '101' }]} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(screen.getByText('Escribe el nombre completo del apoderado.')).toBeTruthy();
    expect(screen.getByText(/Adjunta el documento/)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText('Nombre completo del apoderado'));
    await user.paste('Laura Gómez');
    await user.click(screen.getByLabelText('Número de documento'));
    await user.paste('10-10');
    await user.upload(screen.getByLabelText(/Documento del poder/), new File(['%PDF-1.7'], 'p.pdf', { type: 'application/pdf' }));
    const send = screen.getByRole('button', { name: 'Enviar solicitud' });
    await user.click(send);
    await user.click(send);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ propertyId: 'U1', proxyFullName: 'Laura Gómez', proxyDocumentType: 'CC',
      proxyDocumentNumber: '10-10', proxyUserId: null, grantorResidentId: null });
    // El residente no puede elegir cuentas ni otorgante (contrato G3): no hay esos campos.
    expect(screen.queryByLabelText('Cuenta del apoderado')).toBeNull();
    expect(screen.queryByLabelText('Propietario que otorga')).toBeNull();
  });

  it('administración: exige otorgante y, si el apoderado tiene cuenta, la cuenta', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ProxyRequestForm units={[{ propertyId: 'U1', label: '101' }]} grantors={[{ residentId: 'R1', propertyId: 'U1', label: 'Ana' }]}
                             accounts={[{ userId: 'USR', label: 'Pedro (102)' }]} onSubmit={onSubmit} />);
    await user.click(screen.getByLabelText(/Con cuenta Havita/));
    await user.click(screen.getByRole('button', { name: 'Registrar poder' }));
    expect(screen.getByText('Elige el propietario que otorga el poder.')).toBeTruthy();
    expect(screen.getByText('Elige la cuenta del apoderado.')).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Propietario que otorga'), 'R1');
    await user.selectOptions(screen.getByLabelText('Cuenta del apoderado'), 'USR');
    await user.click(screen.getByLabelText('Nombre completo del apoderado'));
    await user.paste('Pedro');
    await user.click(screen.getByLabelText('Número de documento'));
    await user.paste('77');
    await user.upload(screen.getByLabelText(/Documento del poder/), new File(['x'], 'p.png', { type: 'image/png' }));
    // P7 (G3): sin evidencia ni declaración no se envía.
    await user.click(screen.getByRole('button', { name: 'Registrar poder' }));
    expect(screen.getByText('Indica cómo se recibió el poder firmado por el otorgante.')).toBeTruthy();
    expect(screen.getByText('Confirma que el documento adjunto es el poder firmado por el otorgante.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    await user.selectOptions(screen.getByLabelText('¿Cómo se recibió el poder firmado?'), 'SIGNED_DOCUMENT_IN_PERSON');
    await user.click(screen.getByLabelText(/Declaro que el documento adjunto/));
    await user.click(screen.getByRole('button', { name: 'Registrar poder' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ grantorResidentId: 'R1', proxyUserId: 'USR',
      evidenceType: 'SIGNED_DOCUMENT_IN_PERSON', grantorConsentAttested: true });
  });

  it('residente: no ve ni envía campos de evidencia administrativa (P7 · G3)', () => {
    render(<ProxyRequestForm units={[{ propertyId: 'U1', label: '101' }]} onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText('¿Cómo se recibió el poder firmado?')).toBeNull();
    expect(screen.queryByLabelText(/Declaro que el documento adjunto/)).toBeNull();
  });
});

const audit = (over: Partial<ParticipationAudit>): ParticipationAudit => ({
  participationId: 'P1', propertyId: 'U1', representationType: 'ADMIN_ASSISTED_PROXY', status: 'VALID', actorUserId: 'ADM',
  castAt: '2026-11-11T10:00:00Z', optionIds: ['O1'], supersedesParticipationId: null, identityVerifiedByUserId: 'ADM',
  identityVerifiedAt: '2026-11-11T10:00:00Z', voidedByUserId: null, voidedAt: null, voidReason: null, ...over,
});

describe('ParticipationHistory (P6-G)', () => {
  it('muestra la cadena con la anulación y su motivo; solo la vigente asistida se puede anular, con motivo', async () => {
    svc.history.mockResolvedValue([
      audit({ participationId: 'P2', supersedesParticipationId: 'P1', optionIds: ['O2'], castAt: '2026-11-11T10:05:00Z' }),
      audit({ status: 'VOIDED', voidedAt: '2026-11-11T10:03:00Z', voidReason: 'Error de digitación' }),
      audit({ participationId: 'D1', propertyId: 'U2', representationType: 'OWNER' }),
    ]);
    svc.voidParticipation.mockResolvedValue({});
    const user = userEvent.setup();
    wrap(<ParticipationHistory pollId="Q1" pollLive unitLabel={(u) => (u === 'U1' ? '101' : '102')}
                               optionText={(o) => (o === 'O1' ? 'Sí' : 'No')} />);
    const units = await screen.findAllByTestId('history-unit');
    const u1 = within(units.find((u) => u.textContent?.includes('101'))!);
    const entries = u1.getAllByTestId('history-entry');
    expect(entries.map((e) => e.getAttribute('data-status'))).toEqual(['VOIDED', 'VALID']);
    expect(entries[0].textContent).toMatch(/Voto · Sí/);
    expect(entries[0].textContent).toMatch(/Motivo: Error de digitación/);
    expect(entries[1].textContent).toMatch(/Nueva emisión · No/);
    expect(u1.getAllByRole('button', { name: /Anular voto asistido/ })).toHaveLength(1);
    // El voto directo (propietario) no ofrece anulación.
    const u2 = within(units.find((u) => u.textContent?.includes('102'))!);
    expect(u2.queryByRole('button', { name: /Anular/ })).toBeNull();
    await user.click(u1.getByRole('button', { name: /Anular voto asistido/ }));
    await waitFor(() => expect(svc.voidParticipation).toHaveBeenCalledWith('Q1', 'P2', 'Error de digitación'));
  });

  it('motivo vacío: no se anula', async () => {
    svc.history.mockResolvedValue([audit({})]);
    notify.showPrompt.mockResolvedValue('   ');
    const user = userEvent.setup();
    wrap(<ParticipationHistory pollId="Q1" pollLive unitLabel={() => '101'} optionText={() => 'Sí'} />);
    await user.click(await screen.findByRole('button', { name: /Anular voto asistido/ }));
    expect(notify.showError).toHaveBeenCalledWith('Motivo obligatorio', expect.any(String));
    expect(svc.voidParticipation).not.toHaveBeenCalled();
  });

  it('pregunta cerrada: sin botón de anular', async () => {
    svc.history.mockResolvedValue([audit({})]);
    wrap(<ParticipationHistory pollId="Q1" pollLive={false} unitLabel={() => '101'} optionText={() => 'Sí'} />);
    await screen.findByTestId('history-entry');
    expect(screen.queryByRole('button', { name: /Anular/ })).toBeNull();
  });
});

describe('AssistedVotePanel (P6-F)', () => {
  it('solo ofrece poderes UTILIZADOS de apoderados externos; exige verificación y confirmación; muestra el comprobante', async () => {
    svc.history.mockResolvedValue([]);
    svc.assistedVote.mockResolvedValue({ participationId: 'NEW1', castAt: '2026-11-11T10:00:00Z', supersedesParticipationId: 'OLD1' });
    const user = userEvent.setup();
    wrap(<AssistedVotePanel livePolls={[livePoll]} unitLabel={() => '101'} proxies={[
      proxy({}), proxy({ id: 'PX2', proxyUserId: 'USR', proxyFullName: 'Con Cuenta' }), proxy({ id: 'PX3', status: 'APPROVED', proxyFullName: 'Aprobado' }),
    ]} />);
    const select = screen.getByLabelText('Poder utilizado (apoderado externo)');
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Selecciona…', '101 · Laura Gómez']);
    await user.selectOptions(select, 'PX1');
    await user.type(screen.getByLabelText('Número del documento presentado'), '1010');
    await user.click(screen.getByLabelText('Sí'));
    await user.click(screen.getByRole('button', { name: 'Registrar voto asistido' }));
    expect(screen.getByTestId('assisted-error').textContent).toMatch(/Confirma la verificación/);
    expect(svc.assistedVote).not.toHaveBeenCalled();
    await user.click(screen.getByLabelText(/Verifiqué en persona/));
    await user.click(screen.getByLabelText(/expresó personalmente/));
    await user.click(screen.getByRole('button', { name: 'Registrar voto asistido' }));
    await waitFor(() => expect(svc.assistedVote).toHaveBeenCalledWith('Q1', {
      proxyId: 'PX1', documentType: 'CC', documentNumber: '1010', expressedByProxyConfirmed: true, optionIds: ['O1'] }));
    const receipt = await screen.findByTestId('assisted-receipt');
    expect(receipt.textContent).toMatch(/Nueva emisión registrada/);
    expect(receipt.textContent).toMatch(/NEW1/);
    // El documento presentado no queda en el formulario tras registrar.
    expect((screen.getByLabelText('Número del documento presentado') as HTMLInputElement).value).toBe('');
  });

  it('error del backend (identidad distinta) se muestra con su mensaje', async () => {
    svc.history.mockResolvedValue([]);
    svc.assistedVote.mockRejectedValue(new ApiError('x', 409, { code: 'PROXY_IDENTITY_MISMATCH' }));
    const user = userEvent.setup();
    wrap(<AssistedVotePanel livePolls={[livePoll]} unitLabel={() => '101'} proxies={[proxy({})]} />);
    await user.selectOptions(screen.getByLabelText('Poder utilizado (apoderado externo)'), 'PX1');
    await user.type(screen.getByLabelText('Número del documento presentado'), '999');
    await user.click(screen.getByLabelText(/Verifiqué en persona/));
    await user.click(screen.getByLabelText(/expresó personalmente/));
    await user.click(screen.getByLabelText('No'));
    await user.click(screen.getByRole('button', { name: 'Registrar voto asistido' }));
    expect((await screen.findByTestId('assisted-error')).textContent).toMatch(/no coincide/);
  });

  it('sin preguntas abiertas no hay formulario', () => {
    wrap(<AssistedVotePanel livePolls={[]} unitLabel={() => '101'} proxies={[proxy({})]} />);
    expect(screen.getByTestId('assisted-no-poll')).toBeTruthy();
  });
});

describe('ProxyLimitSettings (P6-H)', () => {
  it('muestra el valor y su origen; valida y guarda tras confirmar', async () => {
    svc.limit.mockResolvedValue({ configured: false, communityLimit: null, globalLimit: 3, effectiveLimit: 3 });
    svc.setLimit.mockResolvedValue({ configured: true, communityLimit: 2, globalLimit: 3, effectiveLimit: 2 });
    svc.limitHistory.mockResolvedValue({ communityId: 'T', communityName: 'Comunidad', items: [], page: 0, size: 10, total: 0 });
    const user = userEvent.setup();
    wrap(<ProxyLimitSettings />);
    expect((await screen.findByTestId('proxy-limit-current')).textContent).toMatch(/3 unidad\(es\) por apoderado · Valor general/);
    const input = screen.getByLabelText(/Unidades por apoderado/);
    await user.type(input, '0');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByRole('alert').textContent).toMatch(/entero/);
    await user.clear(input);
    await user.type(input, '2');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(svc.setLimit).toHaveBeenCalledWith(2));
  });

  it('P7 · G4: historial con anterior, nuevo, fecha, administrador y motivo; paginado', async () => {
    svc.limit.mockResolvedValue({ configured: true, communityLimit: 5, globalLimit: null, effectiveLimit: 5 });
    const row = (i: number, prev: number | null, next: number | null, conf = true) => ({ id: `H${i}`, previousConfigured: conf,
      previousMaxUnits: prev, newMaxUnits: next, occurredAt: '2026-11-11T10:00:00Z', actorUserId: 'ADM', actorName: 'Admin Uno', reason: null });
    svc.limitHistory.mockImplementation(async (page: number) => page === 0
      ? { communityId: 'T', communityName: 'Torres', items: [row(1, 2, 5), row(2, null, 2, false)], page: 0, size: 10, total: 12 }
      : { communityId: 'T', communityName: 'Torres', items: [row(3, null, null)], page: 1, size: 10, total: 12 });
    const user = userEvent.setup();
    wrap(<ProxyLimitSettings />);
    const rows = await screen.findAllByTestId('proxy-limit-history-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toMatch(/25Admin Uno—/);
    expect(rows[1].textContent).toMatch(/Valor general2Admin Uno/);
    expect(screen.getByTestId('proxy-limit-history').textContent).toMatch(/Torres/);
    expect(screen.getByText('Página 1 de 2')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(svc.limitHistory).toHaveBeenCalledWith(1, 10));
    expect((await screen.findAllByTestId('proxy-limit-history-row'))[0].textContent).toMatch(/Sin límite/);
  });
});

describe('ResidentProxiesPage (P6-B/D/E)', () => {
  beforeEach(() => {
    assemblies.getAssemblies.mockResolvedValue([{ id: 'A1', title: 'Ordinaria', date: '2026-11-11', status: 'IN_PROGRESS' }]);
    assemblies.getMyAttendanceUnits.mockResolvedValue([{ propertyId: 'U9', label: 'Apto 909', number: '909', relations: ['Propietario'] }]);
    polls.getPolls.mockResolvedValue([livePoll]);
  });

  it('separa lo que otorgué de lo que represento; solo acciones válidas por estado; vota por la unidad del poder', async () => {
    svc.mine.mockResolvedValue([
      { relation: 'GRANTOR', proxy: proxy({ id: 'G1', propertyId: 'U9', status: 'APPROVED', propertyNumber: '909' }) },
      { relation: 'GRANTOR', proxy: proxy({ id: 'G2', propertyId: 'U9', status: 'REJECTED', rejectionReason: 'Documento ilegible', propertyNumber: '909' }) },
      { relation: 'PROXY', proxy: proxy({ id: 'R1', proxyUserId: 'ME', status: 'USED', propertyNumber: '101' }) },
    ]);
    svc.proxyVote.mockResolvedValue({ castAt: '2026-11-11T10:00:00Z' });
    const user = userEvent.setup();
    wrap(<ResidentProxiesPage />);
    const granted = await screen.findAllByTestId('granted-proxy');
    expect(granted).toHaveLength(2);
    expect(within(granted[0]).getByRole('button', { name: /Revocar/ })).toBeTruthy();
    expect(within(granted[1]).queryByRole('button', { name: /Revocar/ })).toBeNull();
    expect(granted[1].textContent).toMatch(/Motivo del rechazo: Documento ilegible/);
    const rep = screen.getByTestId('represented-proxy');
    expect(rep.textContent).toMatch(/Unidad 101/);
    await user.click(within(rep).getByLabelText('No'));
    await user.click(within(rep).getByRole('button', { name: /Votar por la unidad 101/ }));
    await waitFor(() => expect(svc.proxyVote).toHaveBeenCalledWith('Q1', 'R1', ['O2']));
    expect(await screen.findByTestId('proxy-vote-done')).toBeTruthy();
  });

  it('backend con la funcionalidad apagada: aviso de no disponible', async () => {
    svc.mine.mockRejectedValue(new ApiError('Not Found', 404, {}));
    wrap(<ResidentProxiesPage />);
    expect((await screen.findByTestId('proxies-unavailable')).textContent).toMatch(/no están disponibles/);
  });
});
