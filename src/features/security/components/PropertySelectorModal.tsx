import React, { useState, useMemo } from 'react';
import { X, Building2, ChevronLeft, CheckCircle2, Home } from 'lucide-react';
import type { PropertyUnit } from '../../../types';

interface PropertySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: PropertyUnit[];
  onSelect: (prop: PropertyUnit) => void;
}

export const PropertySelectorModal: React.FC<PropertySelectorModalProps> = ({ isOpen, onClose, properties, onSelect }) => {
  const [selectedStructure, setSelectedStructure] = useState<string | null>(null);

  // Filter only occupied properties
  const occupiedProperties = useMemo(() => {
    return properties.filter(p => p.status === 'OCCUPIED');
  }, [properties]);

  const structures = useMemo(() => {
    const map = new Map<string, number>();
    occupiedProperties.forEach(p => {
      const s = p.structureName || 'General';
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [occupiedProperties]);

  const unitsByLevel = useMemo(() => {
    if (!selectedStructure) return {};
    const units = occupiedProperties.filter(p => (p.structureName || 'General') === selectedStructure);
    
    const levels: Record<string, PropertyUnit[]> = {};
    units.forEach(u => {
      const lvl = u.level?.toString() || '1';
      if (!levels[lvl]) levels[lvl] = [];
      levels[lvl].push(u);
    });
    
    // Sort units within each level
    Object.keys(levels).forEach(lvl => {
      levels[lvl].sort((a, b) => (a.number || a.name).localeCompare(b.number || b.name, undefined, { numeric: true }));
    });
    
    return levels;
  }, [selectedStructure, occupiedProperties]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            {selectedStructure && (
              <button 
                onClick={() => setSelectedStructure(null)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[var(--tenant-primary)] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {selectedStructure ? `Apartamentos - ${selectedStructure}` : 'Seleccionar Destino'}
              </h3>
              <p className="text-xs text-slate-500">
                {selectedStructure ? 'Selecciona la unidad ocupada a visitar' : 'Elige la torre o estructura del residente'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 min-h-[300px]">
          {!selectedStructure ? (
            /* Structure Grid */
            structures.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-8">
                <Home className="w-12 h-12 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">No hay apartamentos marcados como "Ocupados" actualmente.</p>
                <p className="text-xs text-slate-400">Las visitas solo pueden registrarse a unidades con residentes activos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {structures.map(str => (
                  <button
                    key={str.name}
                    onClick={() => setSelectedStructure(str.name)}
                    className="flex flex-col items-start p-4 bg-slate-50 hover:bg-[var(--tenant-primary)]/5 hover:border-[var(--tenant-primary)]/30 border border-slate-200 rounded-2xl transition-all text-left cursor-pointer group"
                  >
                    <Building2 className="w-6 h-6 text-slate-400 group-hover:text-[var(--tenant-primary)] mb-2 transition-colors" />
                    <span className="font-bold text-slate-900 text-sm group-hover:text-[var(--tenant-primary)] transition-colors">{str.name}</span>
                    <span className="text-xs text-slate-500 mt-1">{str.count} unidades ocupadas</span>
                  </button>
                ))}
              </div>
            )
          ) : (
            /* Units Grid by Level */
            <div className="space-y-6">
              {Object.entries(unitsByLevel)
                .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                .map(([level, units]) => (
                  <div key={level} className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="h-px bg-slate-200 flex-1"></span>
                      Piso / Nivel {level}
                      <span className="h-px bg-slate-200 flex-1"></span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {units.map(unit => (
                        <button
                          key={unit.id}
                          onClick={() => {
                            onSelect(unit);
                            onClose();
                            // Optional delay could be added here, but direct is fine
                          }}
                          className="p-3 bg-white border border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50 rounded-xl transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                        >
                          <span className="font-bold text-slate-700 group-hover:text-emerald-700 text-sm">{unit.number || unit.name}</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
