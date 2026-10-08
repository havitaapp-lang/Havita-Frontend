import React from 'react';
import { ArrowLeft, Building2, CheckCircle2, AlertCircle, Wrench, Layers, Trash2 } from 'lucide-react';
import type { PropertyUnit } from '../../../../types';
import type { StructureSummary } from '../../../../types/property.types';
import { propertiesService } from '../../../../services/propertiesService';
import { FloorStack } from './FloorStack';
import { EmptyState } from '../../../../components/ui/EmptyState';

interface StructureDetailViewProps {
  structureName: string;
  properties: PropertyUnit[];
  structureSummary?: StructureSummary;
  selectedProperty: PropertyUnit | null;
  onSelectProperty: (property: PropertyUnit) => void;
  onBack: () => void;
  onOpenCreate: () => void;
  onDeleteStructure?: (name: string) => void;
}

export const StructureDetailView: React.FC<StructureDetailViewProps> = ({
  structureName,
  properties,
  structureSummary,
  selectedProperty,
  onSelectProperty,
  onBack,
  onOpenCreate,
  onDeleteStructure,
}) => {
  const levels = propertiesService.getLevelsForStructure(properties, structureName);

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a estructuras</span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          <nav className="text-xs text-slate-500 flex items-center gap-1.5">
            <span>Propiedades</span>
            <span>/</span>
            <span>Estructura</span>
            <span>/</span>
            <span className="font-bold text-slate-900">{structureName}</span>
          </nav>
        </div>

        {/* Structure Badges Summary & Actions */}
        <div className="flex items-center gap-3">
          {structureSummary && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-700">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>{structureSummary.levelsCount} niveles</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{structureSummary.occupiedUnits} ocupadas</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-xs font-semibold text-amber-700">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>{structureSummary.vacantUnits} vacantes</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 text-xs font-semibold text-orange-700">
                <Wrench className="w-3.5 h-3.5 text-orange-600" />
                <span>{structureSummary.maintenanceUnits} mant.</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                {structureSummary.occupancyRate}% Ocupación
              </span>
            </div>
          )}
          
          {onDeleteStructure && (
            <button
              onClick={() => onDeleteStructure(structureName)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar Estructura"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Structure Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 border border-white/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">{structureName}</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Explorador visual 2D de apartamentos y distribución por niveles. Haz clic en una unidad para ver detalles.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          + Agregar propiedad en esta estructura
        </button>
      </div>

      {/* Levels and Floors Section */}
      {levels.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={'No hay propiedades configuradas en ' + structureName}
          description="Comienza agregando las propiedades o apartamentos correspondientes a esta estructura."
          actionLabel="Agregar propiedad"
          onAction={onOpenCreate}
        />
      ) : (
        <FloorStack
          levels={levels}
          selectedProperty={selectedProperty}
          onSelectProperty={onSelectProperty}
          structureType={structureSummary?.structureType || 'Torre'}
        />
      )}
    </div>
  );
};
