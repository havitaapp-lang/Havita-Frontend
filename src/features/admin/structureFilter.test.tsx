import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ALL_STRUCTURES, WITHOUT_STRUCTURE, matchesStructure, structureOptions, structureQueryParam,
} from './structureFilter';
import { StructureFilterSelect } from './StructureFilterSelect';

const units = [
  { id: 'u1', structureId: 'T1', structureName: 'Torre 1' },
  { id: 'u2', structureId: 'T10', structureName: 'Torre 10' },
  { id: 'u3', structureId: 'T2', structureName: 'Torre 2' },
  { id: 'u4', structureId: 'T1', structureName: 'Torre 1' },
  { id: 'u5', structureId: null, structureName: null }, // casa sin estructura
];

const pick = (filter: string) => units.filter((u) => matchesStructure(u, filter)).map((u) => u.id);

afterEach(() => cleanup());

describe('filtro administrativo por estructura (Fase 2 / E4)', () => {
  it('opciones: una por id, orden natural (Torre 2 antes que Torre 10) y detecta unidades sin estructura', () => {
    const { options, hasUnitsWithoutStructure } = structureOptions(units);
    expect(options.map((o) => o.label)).toEqual(['Torre 1', 'Torre 2', 'Torre 10']);
    expect(hasUnitsWithoutStructure).toBe(true);
  });

  it('Torre 1 no incluye Torre 10 (comparación por id); cambiar de estructura cambia el resultado', () => {
    expect(pick('T1')).toEqual(['u1', 'u4']);
    expect(pick('T10')).toEqual(['u2']);
    expect(pick('T2')).toEqual(['u3']);
  });

  it('«Todas» y «Sin estructura»; las casas siguen accesibles', () => {
    expect(pick(ALL_STRUCTURES)).toHaveLength(5);
    expect(pick(WITHOUT_STRUCTURE)).toEqual(['u5']);
    expect(pick('estructura-inexistente')).toEqual([]); // estado vacío
  });

  it('parámetro del backend: ausente para todas, "none" o el id', () => {
    expect(structureQueryParam(ALL_STRUCTURES)).toBeUndefined();
    expect(structureQueryParam(WITHOUT_STRUCTURE)).toBe('none');
    expect(structureQueryParam('T10')).toBe('T10');
  });

  it('comunidad de casas sin torres: no se muestra el selector (no obliga a elegir torre)', () => {
    const { options, hasUnitsWithoutStructure } = structureOptions([{ structureId: null }, { structureId: undefined }]);
    render(<StructureFilterSelect value={ALL_STRUCTURES} onChange={() => {}} options={options} hasUnitsWithoutStructure={hasUnitsWithoutStructure} />);
    expect(screen.queryByTestId('structure-filter')).toBeNull();
  });

  it('una sola torre: selector con «Todas» y esa torre; sin «Sin estructura» si no hay casas', async () => {
    const { options, hasUnitsWithoutStructure } = structureOptions([{ structureId: 'T1', structureName: 'Torre 1' }]);
    const onChange = vi.fn();
    render(<StructureFilterSelect value={ALL_STRUCTURES} onChange={onChange} options={options} hasUnitsWithoutStructure={hasUnitsWithoutStructure} />);
    const select = screen.getByTestId('structure-filter') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.text)).toEqual(['Todas las estructuras', 'Torre 1']);
    await userEvent.setup().selectOptions(select, 'T1');
    expect(onChange).toHaveBeenCalledWith('T1');
  });
});
