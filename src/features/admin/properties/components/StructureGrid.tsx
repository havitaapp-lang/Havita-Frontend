import React from 'react';
import { StructureCard } from './StructureCard';
import type { StructureSummary } from '../../../../types/property.types';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Building2 } from 'lucide-react';

interface StructureGridProps {
  structures: StructureSummary[];
  onSelectStructure: (name: string) => void;
  onOpenCreateModal: () => void;
}

export const StructureGrid: React.FC<StructureGridProps> = ({
  structures,
  onSelectStructure,
  onOpenCreateModal,
}) => {
  if (structures.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="Aún no has configurado la estructura de tu comunidad"
        description="Agrega torres, bloques, casas o sectores para comenzar a organizar visualmente tus propiedades y pisos."
        actionLabel="Configurar estructura"
        onAction={onOpenCreateModal}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Estructura de la Comunidad ({structures.length})
        </h3>
        <span className="text-xs text-slate-400">Selecciona una estructura para explorar pisos y apartamentos</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {structures.map((structure) => (
          <StructureCard
            key={structure.name}
            structure={structure}
            onSelect={onSelectStructure}
          />
        ))}
      </div>
    </div>
  );
};
