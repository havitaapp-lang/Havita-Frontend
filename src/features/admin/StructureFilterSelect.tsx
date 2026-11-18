import { ALL_STRUCTURES, WITHOUT_STRUCTURE } from './structureFilter';
import type { StructureOption } from './structureFilter';

export interface StructureFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: StructureOption[];
  hasUnitsWithoutStructure: boolean;
  className?: string;
}

/** Selector reutilizable (Unidades y Directorio). No se pinta si la comunidad no tiene estructuras. */
export function StructureFilterSelect({ value, onChange, options, hasUnitsWithoutStructure, className }: StructureFilterSelectProps) {
  if (options.length === 0) return null;
  return (
    <select
      aria-label="Filtrar por torre, bloque o manzana"
      data-testid="structure-filter"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? 'px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 shrink-0'}
    >
      <option value={ALL_STRUCTURES}>Todas las estructuras</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
      {hasUnitsWithoutStructure && <option value={WITHOUT_STRUCTURE}>Sin estructura</option>}
    </select>
  );
}
