import React from 'react';
import type { PropertyUnit } from '../../../../types';
import { PropertyUnitBadge } from './PropertyUnitBadge';
import { Layers } from 'lucide-react';

interface FloorStackProps {
  levels: { level: string | number; units: PropertyUnit[] }[];
  selectedProperty: PropertyUnit | null;
  onSelectProperty: (property: PropertyUnit) => void;
  structureType?: string;
}

export const FloorStack: React.FC<FloorStackProps> = ({
  levels,
  selectedProperty,
  onSelectProperty,
  structureType = 'Torre',
}) => {
  const isTower = structureType === 'Torre' || structureType === 'Bloque';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-1 border-b border-slate-200">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>{isTower ? 'Distribución por Pisos (de superior a inferior)' : 'Distribución de Unidades'}</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px]">Ocupado</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[11px]">Vacante</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-[11px]">Mantenimiento</span>
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {levels.map(({ level, units }) => (
          <div 
            key={level}
            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs hover:border-slate-300 transition-colors"
          >
            {/* Level Label */}
            <div className="sm:w-24 shrink-0 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-xs font-bold text-slate-700">
                {/^(piso|nivel|s[oó]tano|etapa)\b/i.test(String(level)) ? level : (isTower ? 'Piso ' + level : 'Nivel ' + level)}
              </span>
              <span className="text-[10px] text-slate-400 sm:hidden">
                ({units.length} unds)
              </span>
            </div>

            {/* Units in this level */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {units.map((unit) => (
                <PropertyUnitBadge
                  key={unit.id}
                  property={unit}
                  onSelect={onSelectProperty}
                  isSelected={selectedProperty?.id === unit.id}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
