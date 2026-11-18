/**
 * Traducción VISUAL de estados: todo valor que el backend puede enviar a las pantallas de administración debe tener
 * etiqueta en español, y la traducción nunca cambia el valor interno.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  STATUS_LABELS, clearMissingStatusLabels, getMissingStatusLabels, getStatusLabel, statusLabelFor, type StatusDomain,
} from './statusLabels';

// Valores de los enums del backend (Havita-Backend, solo lectura) que se muestran en administración.
const BACKEND: Record<StatusDomain, string[]> = {
  assembly: ['SCHEDULED', 'IN_PROGRESS', 'ENDED'],
  assemblyType: ['ORDINARIA', 'EXTRAORDINARIA'],
  assemblyModality: ['PRESENCIAL', 'VIRTUAL', 'MIXTA'],
  visitor: ['AUTHORIZED', 'PENDING', 'ENTERED', 'EXITED', 'EXPIRED', 'CANCELLED'],
  package: ['RECEIVED', 'NOTIFIED', 'DELIVERED'],
  pqrs: ['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  staff: ['ACTIVE', 'INACTIVE', 'ACTIVO', 'INACTIVO', 'SUSPENDIDO', 'FINALIZADO'],
  staffRole: ['COMMUNITY_ADMIN', 'SECURITY', 'STAFF', 'RESIDENT', 'ACCOUNTANT', 'PORTERÍA', 'SEGURIDAD', 'ADMINISTRADOR',
    'MANTENIMIENTO', 'SOLO_LECTURA'],
  shift: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'ABSENT', 'CANCELLED', 'PROGRAMADO', 'EN_CURSO', 'COMPLETADO',
    'AUSENTE', 'CANCELADO'],
  attendance: ['PRESENT', 'LATE', 'ABSENT', 'INCOMPLETE', 'PRESENTE', 'TARDANZA', 'AUSENTE', 'INCOMPLETO'],
  intercomCall: ['INITIATING', 'RINGING', 'ACCEPTED', 'REJECTED', 'MISSED', 'ENDED', 'FAILED', 'CANCELLED'],
};

// Otros enums del backend que las pantallas de administración muestran con getStatusLabel.
const GENERAL = [
  'PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED', 'COMPLETED', // ReservationStatus
  'PUBLISHED', 'DRAFT', 'ARCHIVED', // CommunicationStatus
  'VACANT', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE', 'ACTIVE', // PropertyStatus / ResidentStatus
  'PENDING_APPROVAL', 'HIDDEN', 'EXPIRED', // ListingStatus
  'OPEN', 'RESOLVED', 'DISMISSED', // ReportStatus
  'LIVE', 'SCHEDULED', 'CLOSED', // PollStatus
  'PENDING_REVIEW', 'APPROVED', 'REVOKED', 'USED', // AssemblyProxyStatus
  'ACKNOWLEDGED', 'FALSE_ALARM', // PanicAlertStatus
  'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'PENDING_VERIFICATION', // facturación
  'INVALIDATED', // VotingDelegationStatus
];

// Una etiqueta «técnica» (PENDING, IN_PROGRESS…) no debe llegar nunca a la pantalla.
const TECHNICAL = /^[A-Z0-9_]+$|_/;

afterEach(() => clearMissingStatusLabels());

describe('statusLabelFor — cobertura por módulo', () => {
  for (const [domain, values] of Object.entries(BACKEND) as [StatusDomain, string[]][]) {
    it(`${domain}: todos los valores del backend tienen etiqueta en español`, () => {
      for (const v of values) {
        const label = statusLabelFor(domain, v);
        expect(label, `${domain}:${v}`).not.toMatch(TECHNICAL);
        expect(label, `${domain}:${v}`).not.toBe(v);
      }
      expect(getMissingStatusLabels()).toEqual([]);
    });
  }

  it('usa el vocabulario y el género del módulo', () => {
    expect(statusLabelFor('assembly', 'SCHEDULED')).toBe('Programada');
    expect(statusLabelFor('assembly', 'ENDED')).toBe('Finalizada');
    expect(statusLabelFor('shift', 'SCHEDULED')).toBe('Programado');
    expect(statusLabelFor('pqrs', 'RESOLVED')).toBe('Resuelta');
    expect(statusLabelFor('visitor', 'AUTHORIZED')).toBe('Esperado');
    expect(statusLabelFor('attendance', 'PRESENT')).toBe('A tiempo');
    expect(statusLabelFor('intercomCall', 'MISSED')).toBe('No contestó');
    expect(statusLabelFor('staffRole', 'SECURITY')).toBe('Portería');
    expect(statusLabelFor('assemblyModality', 'MIXTA')).toBe('Mixta');
  });

  it('acepta minúsculas y espacios; vacío → «—»', () => {
    expect(statusLabelFor('package', ' delivered ')).toBe('Entregado');
    expect(statusLabelFor('package', null)).toBe('—');
    expect(statusLabelFor('package', '', 'Sin estado')).toBe('Sin estado');
  });
});

describe('getStatusLabel — enums generales', () => {
  it('todos tienen etiqueta en español (sin caer en el texto técnico)', () => {
    for (const v of GENERAL) {
      expect(STATUS_LABELS[v], v).toBeTruthy();
      expect(getStatusLabel(v), v).not.toMatch(TECHNICAL);
    }
    expect(getMissingStatusLabels()).toEqual([]);
  });

  it('mayúsculas a la española (solo la primera letra)', () => {
    expect(getStatusLabel('IN_PROGRESS')).toBe('En proceso');
    expect(getStatusLabel('LIVE')).toBe('En vivo');
    expect(getStatusLabel('PARTIALLY_PAID')).toBe('Pago parcial');
  });
});

describe('estados sin traducción: no se ocultan, se registran', () => {
  it('muestra un texto legible y lo registra para corregirlo', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(statusLabelFor('package', 'LOST_IN_TRANSIT')).toBe('Lost in transit');
    expect(getStatusLabel('SOMETHING_NEW')).toBe('Something new');
    expect(getMissingStatusLabels()).toEqual(['package:LOST_IN_TRANSIT', 'general:SOMETHING_NEW']);
    warn.mockRestore();
  });
});

describe('la traducción es solo visual', () => {
  it('no modifica el valor interno que se envía al backend', () => {
    const visitor = { status: 'AUTHORIZED' };
    statusLabelFor('visitor', visitor.status);
    expect(visitor.status).toBe('AUTHORIZED');
  });
});
