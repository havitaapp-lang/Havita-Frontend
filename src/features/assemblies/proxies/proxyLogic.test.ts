import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../api/apiClient';
import {
  STATUS_LABELS, canVoid, chainsByUnit, documentProblem, eventReasonLabel, limitValueLabel, parseLimit, proxyActions,
  type ParticipationAudit, type ProxyStatus,
} from './proxyTypes';
import { errorCode, isFeatureUnavailable, proxyErrorMessage } from './proxyErrors';
import { isAssemblyProxiesEnabled } from './featureFlags';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), downloadFile: vi.fn() }));
vi.mock('../../../api/apiClient', async (orig) => ({ ...(await orig<object>()), apiClient: api }));
import { proxyService } from './proxyService';

afterEach(() => vi.clearAllMocks());

describe('estados y acciones de poderes (P6)', () => {
  it('cada estado del backend tiene etiqueta en español', () => {
    const all: ProxyStatus[] = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED', 'USED'];
    expect(all.map((s) => STATUS_LABELS[s])).toEqual(['En revisión', 'Aprobado', 'Rechazado', 'Revocado', 'Vencido', 'Utilizado']);
  });

  it('administración: aprobar y rechazar solo en revisión; revocar en revisión o aprobado; asistencia solo aprobado', () => {
    const p = (status: ProxyStatus) => proxyActions({ status, proxyUserId: null }, 'ADMIN', 'IN_PROGRESS');
    expect(p('PENDING_REVIEW')).toMatchObject({ canApprove: true, canReject: true, canRevoke: true, canRegisterAttendanceByAdmin: false });
    expect(p('APPROVED')).toMatchObject({ canApprove: false, canReject: false, canRevoke: true, canRegisterAttendanceByAdmin: true });
    for (const s of ['USED', 'REJECTED', 'REVOKED', 'EXPIRED'] as ProxyStatus[]) {
      expect(p(s)).toMatchObject({ canApprove: false, canReject: false, canRevoke: false, canRegisterAttendanceByAdmin: false });
    }
    // Asamblea finalizada: nada que cambie el poder (salvo rechazar uno en revisión, que el backend permite).
    expect(proxyActions({ status: 'APPROVED', proxyUserId: null }, 'ADMIN', 'ENDED'))
      .toMatchObject({ canApprove: false, canRevoke: false, canRegisterAttendanceByAdmin: false });
  });

  it('otorgante revoca antes de usarse; el apoderado con cuenta asiste (en curso) y vota (utilizado); el externo no', () => {
    expect(proxyActions({ status: 'USED', proxyUserId: 'u' }, 'GRANTOR', 'IN_PROGRESS').canRevoke).toBe(false);
    expect(proxyActions({ status: 'APPROVED', proxyUserId: 'u' }, 'GRANTOR', 'SCHEDULED').canRevoke).toBe(true);
    expect(proxyActions({ status: 'APPROVED', proxyUserId: 'u' }, 'PROXY', 'SCHEDULED').canSelfAttend).toBe(false);
    expect(proxyActions({ status: 'APPROVED', proxyUserId: 'u' }, 'PROXY', 'IN_PROGRESS').canSelfAttend).toBe(true);
    expect(proxyActions({ status: 'USED', proxyUserId: 'u' }, 'PROXY', 'IN_PROGRESS').canVoteAsProxy).toBe(true);
    expect(proxyActions({ status: 'USED', proxyUserId: null }, 'PROXY', 'IN_PROGRESS').canVoteAsProxy).toBe(false);
    expect(proxyActions({ status: 'USED', proxyUserId: 'u' }, 'PROXY', 'ENDED').canVoteAsProxy).toBe(false);
    expect(proxyActions({ status: 'PENDING_REVIEW', proxyUserId: 'u' }, 'PROXY', 'IN_PROGRESS').canApprove).toBe(false);
  });

  it('solo se ofrece anular un voto ASISTIDO VIGENTE con la pregunta abierta', () => {
    expect(canVoid({ representationType: 'ADMIN_ASSISTED_PROXY', status: 'VALID' }, true)).toBe(true);
    expect(canVoid({ representationType: 'ADMIN_ASSISTED_PROXY', status: 'VALID' }, false)).toBe(false);
    expect(canVoid({ representationType: 'ADMIN_ASSISTED_PROXY', status: 'VOIDED' }, true)).toBe(false);
    for (const t of ['OWNER', 'CO_OWNER', 'TENANT_DELEGATE', 'ACCOUNT_PROXY'] as const) {
      expect(canVoid({ representationType: t, status: 'VALID' }, true)).toBe(false);
    }
  });

  it('historial: la cadena P1 → P2 → P3 se ordena por sustitución, no por el orden de llegada', () => {
    const e = (id: string, prev: string | null, status: 'VALID' | 'VOIDED', at: string): ParticipationAudit => ({
      participationId: id, propertyId: 'U1', representationType: 'ADMIN_ASSISTED_PROXY', status, actorUserId: 'a', castAt: at,
      optionIds: ['O'], supersedesParticipationId: prev, identityVerifiedByUserId: 'a', identityVerifiedAt: at,
      voidedByUserId: null, voidedAt: null, voidReason: null,
    });
    const chain = chainsByUnit([e('P3', 'P2', 'VALID', '2026-01-01T10:03'), e('P1', null, 'VOIDED', '2026-01-01T10:01'),
      e('P2', 'P1', 'VOIDED', '2026-01-01T10:02'), { ...e('X', null, 'VALID', '2026-01-01T10:00'), propertyId: 'U2' }]);
    expect(chain.get('U1')!.map((p) => p.participationId)).toEqual(['P1', 'P2', 'P3']);
    expect(chain.get('U1')!.filter((p) => p.status === 'VALID')).toHaveLength(1);
    expect(chain.get('U2')!.map((p) => p.participationId)).toEqual(['X']);
  });

  it('documento: obligatorio, no vacío, máximo 5 MB, PDF/PNG/JPEG (comodidad; el backend valida la firma)', () => {
    const f = (size: number, type: string) => new File([new Uint8Array(size)], 'x', { type });
    expect(documentProblem(null)).toMatch(/Adjunta/);
    expect(documentProblem(f(0, 'application/pdf'))).toMatch(/vacío/);
    expect(documentProblem(f(5 * 1024 * 1024 + 1, 'application/pdf'))).toMatch(/tamaño máximo/);
    expect(documentProblem(f(10, 'text/plain'))).toMatch(/PDF, PNG o JPEG/);
    expect(documentProblem(f(10, 'image/jpeg'))).toBeNull();
  });
});

describe('errores, bandera y límite (P6)', () => {
  it('códigos conocidos → mensaje claro; 404 sin código = ruta inexistente (bandera apagada)', () => {
    const conflict = new ApiError('x', 409, { code: 'PROPERTY_ALREADY_VOTED', message: 'x' });
    expect(errorCode(conflict)).toBe('PROPERTY_ALREADY_VOTED');
    expect(proxyErrorMessage(conflict)).toMatch(/voto vigente/);
    expect(proxyErrorMessage(new ApiError('x', 409, { code: 'POLL_NOT_LIVE' }))).toMatch(/no está abierta/);
    expect(proxyErrorMessage(new ApiError('x', 409, { code: 'PROXY_IDENTITY_MISMATCH' }))).toMatch(/no coincide/);
    expect(proxyErrorMessage(new ApiError('Mensaje del servidor', 409, { code: 'OTRO_CODIGO' }))).toBe('Mensaje del servidor');
    expect(proxyErrorMessage(new ApiError('x', 403, {}))).toMatch(/permiso/);
    expect(proxyErrorMessage(new ApiError('x', 404, { code: 'RESOURCE_NOT_FOUND' }))).toMatch(/No encontrado/);
    expect(isFeatureUnavailable(new ApiError('x', 404, {}))).toBe(true);
    expect(isFeatureUnavailable(new ApiError('x', 404, { code: 'RESOURCE_NOT_FOUND' }))).toBe(false);
    // Contrato real (sandbox P6): ruta inexistente → 404 ENDPOINT_NOT_FOUND; recurso inexistente → su propio código.
    expect(isFeatureUnavailable(new ApiError('x', 404, { code: 'ENDPOINT_NOT_FOUND' }))).toBe(true);
    expect(isFeatureUnavailable(new ApiError('x', 404, { code: 'ASSEMBLY_NOT_FOUND' }))).toBe(false);
    expect(proxyErrorMessage(new Error('red'))).toBe('No se pudo completar la operación.');
  });

  it('bandera de compilación apagada por defecto', () => {
    expect(isAssemblyProxiesEnabled({})).toBe(false);
    expect(isAssemblyProxiesEnabled({ VITE_FEATURE_ASSEMBLY_PROXIES: 'false' })).toBe(false);
    expect(isAssemblyProxiesEnabled({ VITE_FEATURE_ASSEMBLY_PROXIES: 'true' })).toBe(true);
  });

  it('límite: vacío = sin límite; solo enteros positivos', () => {
    expect(parseLimit('')).toEqual({ value: null });
    expect(parseLimit(' 3 ')).toEqual({ value: 3 });
    expect(parseLimit('0')).toHaveProperty('error');
    expect(parseLimit('-1')).toHaveProperty('error');
    expect(parseLimit('2.5')).toHaveProperty('error');
    expect(parseLimit('abc')).toHaveProperty('error');
  });
});

describe('proxyService usa los contratos reales (P6)', () => {
  it('rutas y cuerpos; la comunidad nunca va en el cuerpo', async () => {
    api.post.mockResolvedValue({});
    api.get.mockResolvedValue([]);
    api.put.mockResolvedValue({});
    await proxyService.mine('A');
    await proxyService.events('A', 'P');
    await proxyService.approve('A', 'P');
    await proxyService.reject('A', 'P', 'motivo');
    await proxyService.revoke('A', 'P');
    await proxyService.attendSelf('A', 'P');
    await proxyService.attendByAdmin('A', 'P', 'CC', ' 123 ');
    await proxyService.proxyVote('Q', 'P', ['O1']);
    await proxyService.assistedVote('Q', { proxyId: 'P', documentType: 'CC', documentNumber: ' 9 ', expressedByProxyConfirmed: true, optionIds: ['O1'] });
    await proxyService.voidParticipation('Q', 'X', ' motivo ');
    await proxyService.history('Q');
    await proxyService.setLimit(null);
    expect(api.get.mock.calls.map((c) => c[0])).toEqual(['/assemblies/A/proxies/mine', '/assemblies/A/proxies/P/events',
      '/assemblies/polls/Q/participations']);
    expect(api.post.mock.calls.map((c) => c[0])).toEqual(['/assemblies/A/proxies/P/approve', '/assemblies/A/proxies/P/reject',
      '/assemblies/A/proxies/P/revoke', '/assemblies/A/proxies/P/attendance/self', '/assemblies/A/proxies/P/attendance',
      '/assemblies/polls/Q/proxy-vote', '/assemblies/polls/Q/assisted-vote', '/assemblies/polls/Q/participations/X/void']);
    expect(api.post.mock.calls[4][1]).toEqual({ documentType: 'CC', documentNumber: '123' });
    expect(api.post.mock.calls[6][1]).toMatchObject({ proxyId: 'P', documentNumber: '9', expressedByProxyConfirmed: true });
    expect(api.post.mock.calls[7][1]).toEqual({ reason: 'motivo' });
    expect(api.put).toHaveBeenCalledWith('/assemblies/proxy-settings', { maxUnitsPerProxy: null });
    for (const c of [...api.post.mock.calls, ...api.put.mock.calls]) {
      expect(JSON.stringify(c[1] ?? {})).not.toMatch(/tenant/i);
    }
  });

  it('solicitud multipart: data JSON + documento; sin otorgante ni cuenta si no se eligen', async () => {
    api.post.mockResolvedValue({});
    const file = new File(['%PDF-1.7'], 'p.pdf', { type: 'application/pdf' });
    await proxyService.request('A', { propertyId: 'U', proxyFullName: ' Ana ', proxyDocumentType: 'CC', proxyDocumentNumber: ' 12 ' }, file);
    const [path, form] = api.post.mock.calls[0];
    expect(path).toBe('/assemblies/A/proxies');
    const data = JSON.parse(await (form as FormData).get('data') instanceof Blob ? await ((form as FormData).get('data') as Blob).text() : '{}');
    expect(data).toEqual({ propertyId: 'U', proxyFullName: 'Ana', proxyDocumentType: 'CC', proxyDocumentNumber: '12' });
    expect((form as FormData).get('document')).toBe(file);
  });
});

describe('P7 · G3 evidencia y G4 historial', () => {
  it('registro administrativo: la evidencia y la declaración viajan en data; historial con paginación', async () => {
    api.post.mockResolvedValue({});
    api.get.mockResolvedValue({ items: [], total: 0 });
    const file = new File(['%PDF-1.7'], 'p.pdf', { type: 'application/pdf' });
    await proxyService.registerByAdmin('A', { propertyId: 'U', grantorResidentId: 'R', proxyFullName: 'Ana', proxyDocumentType: 'CC',
      proxyDocumentNumber: '12', evidenceType: 'AUTHENTICATED_DOCUMENT', grantorConsentAttested: true }, file);
    const [path, form] = api.post.mock.calls[0];
    expect(path).toBe('/assemblies/A/proxies/admin');
    const data = JSON.parse(await ((form as FormData).get('data') as Blob).text());
    expect(data).toMatchObject({ grantorResidentId: 'R', evidenceType: 'AUTHENTICATED_DOCUMENT', grantorConsentAttested: true });
    await proxyService.limitHistory(2, 10);
    expect(api.get).toHaveBeenCalledWith('/assemblies/proxy-settings/history?page=2&size=10');
  });

  it('etiquetas: evidencia en eventos y valores del límite', () => {
    expect(eventReasonLabel('EVIDENCE_SIGNED_DOCUMENT_IN_PERSON')).toMatch(/^Evidencia: Poder firmado entregado en persona/);
    expect(eventReasonLabel('PROXY_ALREADY_USED')).toBe('PROXY_ALREADY_USED');
    expect(eventReasonLabel(null)).toBeNull();
    expect(limitValueLabel(false, null)).toBe('Valor general');
    expect(limitValueLabel(true, null)).toBe('Sin límite');
    expect(limitValueLabel(true, 3)).toBe('3');
  });

  it('códigos nuevos con mensaje en español', () => {
    const e = (code: string) => new ApiError('x', 400, { code });
    expect(proxyErrorMessage(e('EVIDENCE_TYPE_REQUIRED'))).toMatch(/poder firmado/);
    expect(proxyErrorMessage(e('GRANTOR_CONSENT_ATTESTATION_REQUIRED'))).toMatch(/Confirma/);
  });
});
