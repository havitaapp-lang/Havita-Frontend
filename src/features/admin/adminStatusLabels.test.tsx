/**
 * Pantallas de administración: los estados se ven en español, los valores internos de los filtros siguen en inglés y
 * no queda ningún estado técnico (PENDING, IN_PROGRESS…) en la pantalla.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const assemblies = vi.hoisted(() => ({ list: [] as any[] }));
vi.mock('../assemblies/services/assemblyService', () => ({
  assemblyService: { getAssemblies: () => Promise.resolve(assemblies.list) },
}));
const data = vi.hoisted(() => ({ visitors: [] as any[], properties: [] as any[] }));
vi.mock('../../contexts/DataContext', () => ({
  useData: () => ({
    ...data, createVisitor: vi.fn(), updateVisitor: vi.fn(), deleteVisitor: vi.fn(),
    recordVisitorEntry: vi.fn(), recordVisitorExit: vi.fn(),
  }),
}));
vi.mock('../../contexts/TenantContext', () => ({ useTenant: () => ({ currentTenant: { id: 'tenant-1' } }) }));
vi.mock('./components/VisitorScheduleSettings', () => ({ VisitorScheduleSettings: () => null }));

import { AssembliesPage } from '../assemblies/pages/AssembliesPage';
import { AdminVisitors } from './AdminVisitors';
import { PersonalTable } from '../personal/components/PersonalTable';
import { AttendanceLogView } from '../personal/components/AttendanceLogView';

// Estados técnicos que no deben verse (palabras completas en mayúsculas del backend).
const RAW = /\b(SCHEDULED|IN_PROGRESS|ENDED|AUTHORIZED|APPROVED|PENDING|ENTERED|EXITED|EXPIRED|CANCELLED|ACTIVE|INACTIVE|SECURITY|COMMUNITY_ADMIN|PRESENT|LATE|ABSENT|INCOMPLETE|PRESENTE|TARDANZA|AUSENTE)\b/;
const visibleText = () => document.body.textContent || '';

afterEach(() => cleanup());

describe('Asambleas', () => {
  it('muestra «Programada» y «Finalizada» (antes SCHEDULED y ENDED)', async () => {
    assemblies.list = [
      { id: 'a1', title: 'Asamblea programada', status: 'SCHEDULED', type: 'ORDINARIA', modality: 'MIXTA', date: '2026-12-01', time: '10:00', totalProperties: 10, attendees: 0, quorum: 0 },
      { id: 'a2', title: 'Asamblea anterior', status: 'ENDED', type: 'EXTRAORDINARIA', modality: 'VIRTUAL', date: '2026-10-01', time: '10:00', totalProperties: 10, attendees: 6, quorum: 60 },
    ];
    render(<MemoryRouter><AssembliesPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Programada')).toBeTruthy());
    expect(screen.getByText('Finalizada')).toBeTruthy();
    expect(visibleText()).not.toMatch(/\b(SCHEDULED|ENDED)\b/);
  });
});

describe('Visitantes', () => {
  it('AUTHORIZED se ve como «Esperado»; el filtro sigue usando los valores internos', () => {
    data.visitors = [
      { id: 'v1', tenantId: 'tenant-1', propertyId: 'p1', propertyName: 'Apto 101', name: 'Visita Uno', documentId: 'CC1', status: 'AUTHORIZED', expectedAt: 'Hoy' },
      { id: 'v2', tenantId: 'tenant-1', propertyId: 'p1', propertyName: 'Apto 101', name: 'Visita Dos', documentId: 'CC2', status: 'ENTERED' },
      { id: 'v3', tenantId: 'tenant-1', propertyId: 'p1', propertyName: 'Apto 101', name: 'Visita Tres', documentId: 'CC3', status: 'PENDING' },
    ];
    render(<AdminVisitors />);
    expect(screen.getAllByText('Esperado').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Adentro').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);

    // Filtro: texto en español, valor interno en inglés (lo que se compara con los datos del backend).
    const filter = [...document.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.text === 'Todos los estados'))!;
    const opts = Object.fromEntries([...filter.options].map((o) => [o.text, o.value]));
    expect(opts).toMatchObject({ Adentro: 'ENTERED', 'Salió': 'EXITED', Cancelado: 'CANCELLED' });

    // Ningún estado técnico visible (las <option> no cuentan: su texto es español y su valor no se ve).
    const visible = [...document.body.querySelectorAll('span,td,div,p,h1,h2,h3,button,label')]
      .map((el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ')).join(' ');
    expect(visible).not.toMatch(RAW);
  });
});

describe('Personal y asistencia', () => {
  const member = (over: any) => ({
    id: 'm1', tenantId: 'tenant-1', firstName: 'Ana', lastName: 'Sintética', documentType: 'CC', documentNumber: '1',
    phone: '3000000000', email: 'ana@example.test', position: 'Guarda', area: 'SEGURIDAD', contractType: 'DIRECTO',
    startDate: '2026-01-01', status: 'ACTIVE', systemAccess: { enabled: true, role: 'SECURITY', status: 'ACTIVO' }, ...over,
  });

  it('estado y rol del personal en español (el backend envía ACTIVE y SECURITY)', () => {
    render(<MemoryRouter><PersonalTable members={[member({}), member({ id: 'm2', firstName: 'Luis', status: 'INACTIVE', systemAccess: { enabled: true, role: 'COMMUNITY_ADMIN', status: 'ACTIVO' } })] as any}
      onToggleStatus={vi.fn()} onManageAccess={vi.fn()} /></MemoryRouter>);
    expect(screen.getAllByText('Activo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inactivo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Portería').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Administración').length).toBeGreaterThan(0);
    expect(visibleText()).not.toMatch(/\b(ACTIVE|INACTIVE|SECURITY|COMMUNITY_ADMIN)\b/);
  });

  it('asistencia: «A tiempo», «Tardanza», «Ausente» (antes TARDANZA/AUSENTE en mayúsculas)', () => {
    const rec = (id: string, status: string) => ({ id, tenantId: 't', memberId: 'm1', memberName: 'Ana Sintética', position: 'Guarda',
      area: 'SEGURIDAD', date: '2026-11-17', checkIn: '06:00', status });
    render(<AttendanceLogView records={[rec('r1', 'PRESENTE'), rec('r2', 'TARDANZA'), rec('r3', 'AUSENTE')] as any} />);
    expect(screen.getByText('A tiempo')).toBeTruthy();
    expect(screen.getByText('Tardanza')).toBeTruthy();
    expect(screen.getByText('Ausente')).toBeTruthy();
    expect(visibleText()).not.toMatch(/\b(PRESENTE|TARDANZA|AUSENTE)\b/);
  });
});

describe('PQRS', () => {
  it('una PQRS cerrada se ve «Cerrada» (antes aparecía como «Resuelta»)', async () => {
    vi.resetModules();
    vi.doMock('../../contexts/DataContext', () => ({
      useData: () => ({
        pqrsList: [
          { id: 'q1', tenantId: 'tenant-1', propertyId: 'Apto 101', residentName: 'Ana', category: 'Otro', title: 'Caso cerrado', description: 'x', status: 'CLOSED', priority: 'Media', createdAt: '2026-11-17', updatedAt: '2026-11-17' },
          { id: 'q2', tenantId: 'tenant-1', propertyId: 'Apto 102', residentName: 'Luis', category: 'Otro', title: 'Caso en proceso', description: 'y', status: 'IN_PROGRESS', priority: 'Media', createdAt: '2026-11-17', updatedAt: '2026-11-17' },
        ],
        properties: [], residents: [], createPQRS: vi.fn(), updatePQRS: vi.fn(), deletePQRS: vi.fn(), resolvePQRS: vi.fn(),
      }),
    }));
    const { AdminRequests } = await import('./AdminRequests');
    render(<AdminRequests />);
    expect(screen.getAllByText('Cerrada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('En proceso').length).toBeGreaterThan(0);
    // El filtro mantiene los valores internos.
    const filter = [...document.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === 'IN_PROGRESS'))!;
    expect([...filter.options].find((o) => o.value === 'IN_PROGRESS')!.text).toBe('En proceso');
  });
});
