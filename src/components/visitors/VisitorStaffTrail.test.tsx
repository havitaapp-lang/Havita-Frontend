/**
 * Quién autorizó el ingreso y quién registró la salida (portería y administración).
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VisitorStaffTrail } from './VisitorStaffTrail';
import { mergeStaffNames } from '../../contexts/visitorSync';

afterEach(() => cleanup());

describe('VisitorStaffTrail', () => {
  it('muestra quién autorizó el ingreso y quién registró la salida', () => {
    render(<VisitorStaffTrail visitor={{ enteredByName: 'Portero Uno', exitedByName: 'Admin Dos' }} />);
    const t = screen.getByTestId('visitor-staff-trail').textContent;
    expect(t).toContain('Autorizó: Portero Uno');
    expect(t).toContain('Salida: Admin Dos');
  });

  it('solo ingreso', () => {
    render(<VisitorStaffTrail visitor={{ enteredByName: 'Portero Uno' }} />);
    expect(screen.getByTestId('visitor-staff-trail').textContent).not.toContain('Salida');
  });

  it('sin nombres (residente o visitas antiguas) no muestra nada', () => {
    render(<VisitorStaffTrail visitor={{}} />);
    expect(screen.queryByTestId('visitor-staff-trail')).toBeNull();
  });
});

describe('mergeStaffNames', () => {
  it('el evento de la unidad (sin nombres) no borra los del evento del personal', () => {
    const fromStaff = mergeStaffNames({}, { enteredByName: 'Portero Uno', exitedByName: null });
    expect(fromStaff).toEqual({ enteredByName: 'Portero Uno', exitedByName: undefined });
    expect(mergeStaffNames(fromStaff, { enteredByName: null, exitedByName: null })).toEqual(fromStaff);
  });

  it('la salida añade su nombre conservando el del ingreso', () => {
    expect(mergeStaffNames({ enteredByName: 'Portero Uno' }, { enteredByName: 'Portero Uno', exitedByName: 'Admin Dos' }))
      .toEqual({ enteredByName: 'Portero Uno', exitedByName: 'Admin Dos' });
  });
});
