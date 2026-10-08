import React from 'react';
import { Building2, Home, CheckCircle2, AlertCircle, Wrench, PieChart } from 'lucide-react';
import type { CommunityStructureStats } from '../../../../types/property.types';

interface PropertyStatsBarProps {
  stats: CommunityStructureStats;
}

export const PropertyStatsBar: React.FC<PropertyStatsBarProps> = ({ stats }) => {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
      {/* Top metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Propiedades */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Home className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-slate-900 leading-none">
              {stats.totalProperties}
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-1">Propiedades</div>
          </div>
        </div>

        {/* Torres / Estructuras */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-slate-900 leading-none">
              {stats.totalStructures}
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-1">{stats.structureTypeLabel}</div>
          </div>
        </div>

        {/* Ocupadas */}
        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-emerald-950 leading-none">
              {stats.occupiedCount}
            </div>
            <div className="text-[11px] font-medium text-emerald-700 mt-1">Ocupadas</div>
          </div>
        </div>

        {/* Vacantes */}
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-amber-950 leading-none">
              {stats.vacantCount}
            </div>
            <div className="text-[11px] font-medium text-amber-700 mt-1">Vacantes</div>
          </div>
        </div>

        {/* Mantenimiento */}
        <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-orange-950 leading-none">
              {stats.maintenanceCount}
            </div>
            <div className="text-[11px] font-medium text-orange-700 mt-1">Mantenimiento</div>
          </div>
        </div>

        {/* % Ocupación */}
        <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-blue-950 leading-none">
              {stats.occupancyRate}%
            </div>
            <div className="text-[11px] font-medium text-blue-700 mt-1">Ocupación</div>
          </div>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
          <span className="flex items-center gap-2">
            <span>Distribución de Ocupación de la Comunidad</span>
            <span className="text-[11px] text-slate-400">({stats.occupiedCount} de {stats.totalProperties})</span>
          </span>
          <span className="font-bold text-slate-800">{stats.occupancyRate}% Ocupado</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
          <div 
            className="bg-emerald-500 transition-all duration-500" 
            style={{ width: ((stats.occupiedCount / (stats.totalProperties || 1)) * 100) + '%' }}
            title={'Ocupadas: ' + stats.occupiedCount}
          />
          <div 
            className="bg-amber-400 transition-all duration-500" 
            style={{ width: ((stats.vacantCount / (stats.totalProperties || 1)) * 100) + '%' }}
            title={'Vacantes: ' + stats.vacantCount}
          />
          <div 
            className="bg-orange-500 transition-all duration-500" 
            style={{ width: ((stats.maintenanceCount / (stats.totalProperties || 1)) * 100) + '%' }}
            title={'Mantenimiento: ' + stats.maintenanceCount}
          />
          <div 
            className="bg-slate-300 transition-all duration-500" 
            style={{ width: ((stats.inactiveCount / (stats.totalProperties || 1)) * 100) + '%' }}
            title={'Inactivas: ' + stats.inactiveCount}
          />
        </div>
      </div>
    </div>
  );
};
