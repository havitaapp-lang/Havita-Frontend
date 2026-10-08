import React from 'react';
import { ArrowRight, Building2, Layers } from 'lucide-react';
import type { StructureSummary } from '../../../../types/property.types';
import { cn } from '../../../../utils/cn';

interface StructureCardProps {
  structure: StructureSummary;
  onSelect: (structureName: string) => void;
}

export const StructureCard: React.FC<StructureCardProps> = ({ structure, onSelect }) => {
  return (
    <div 
      onClick={() => onSelect(structure.name)}
      className="group bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-blue-400 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {structure.name}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>{structure.levelsCount} pisos · {structure.totalUnits} unidades</span>
              </p>
            </div>
          </div>

          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full",
            structure.occupancyRate >= 90 ? "bg-emerald-50 text-emerald-700" :
            structure.occupancyRate >= 70 ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
          )}>
            {structure.occupancyRate}%
          </span>
        </div>

        {/* Occupancy Progress Bar */}
        <div className="my-3.5">
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              className="bg-emerald-500 transition-all duration-300"
              style={{ width: structure.occupancyRate + '%' }}
            />
            {structure.vacantUnits > 0 && (
              <div 
                className="bg-amber-400 transition-all duration-300"
                style={{ width: ((structure.vacantUnits / (structure.totalUnits || 1)) * 100) + '%' }}
              />
            )}
            {structure.maintenanceUnits > 0 && (
              <div 
                className="bg-orange-500 transition-all duration-300"
                style={{ width: ((structure.maintenanceUnits / (structure.totalUnits || 1)) * 100) + '%' }}
              />
            )}
          </div>
        </div>

        {/* Counts */}
        <div className="grid grid-cols-3 gap-2 py-2 text-center border-t border-b border-slate-100 text-xs">
          <div>
            <div className="font-bold text-slate-900">{structure.occupiedUnits}</div>
            <div className="text-[10px] text-slate-500">Ocupadas</div>
          </div>
          <div>
            <div className={cn("font-bold", structure.vacantUnits > 0 ? "text-amber-600 font-black" : "text-slate-900")}>
              {structure.vacantUnits}
            </div>
            <div className="text-[10px] text-slate-500">Vacantes</div>
          </div>
          <div>
            <div className={cn("font-bold", structure.maintenanceUnits > 0 ? "text-orange-600 font-black" : "text-slate-900")}>
              {structure.maintenanceUnits}
            </div>
            <div className="text-[10px] text-slate-500">Manten.</div>
          </div>
        </div>
      </div>

      {/* CTA Button Footer */}
      <div className="pt-3 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
        <span>Explorar estructura</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};
