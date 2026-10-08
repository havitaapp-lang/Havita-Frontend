import React, { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, CheckSquare, Square, Building2, Layers, Home, Search } from 'lucide-react';
import type { PropertyUnit } from '../../../types';

interface VisualAudienceSelectorProps {
  properties: PropertyUnit[];
  selectedAudiences: string[];
  onChange: (audiences: string[]) => void;
}

export const VisualAudienceSelector: React.FC<VisualAudienceSelectorProps> = ({
  properties,
  selectedAudiences,
  onChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Build hierarchy: Structure -> Level -> Unit
  const hierarchy = useMemo(() => {
    const tree: Record<string, Record<string, PropertyUnit[]>> = {};
    properties.forEach(p => {
      const struct = p.structureName || 'Sin Torre';
      const level = p.level ? String(p.level) : 'Sin Piso';
      
      // Filter logic: if there is a search term, only include matching structures
      if (searchTerm) {
        if (!struct.toLowerCase().includes(searchTerm.toLowerCase())) return;
      }
      
      if (!tree[struct]) tree[struct] = {};
      if (!tree[struct][level]) tree[struct][level] = [];
      
      tree[struct][level].push(p);
    });
    return tree;
  }, [properties, searchTerm]);

  const [expandedStructs, setExpandedStructs] = useState<Record<string, boolean>>({});
  const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({});

  const toggleStruct = (struct: string) => {
    setExpandedStructs(prev => ({ ...prev, [struct]: !prev[struct] }));
  };

  const toggleLevel = (struct: string, level: string) => {
    const key = `${struct}-${level}`;
    setExpandedLevels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelect = (val: string, checked: boolean) => {
    if (checked) {
      const newSelections = new Set(selectedAudiences);
      newSelections.add(val);
      onChange(Array.from(newSelections));
    } else {
      const newSelections = new Set(selectedAudiences);
      newSelections.delete(val);
      onChange(Array.from(newSelections));
    }
  };

  const isSelected = (val: string) => selectedAudiences.includes(val);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input 
          type="text"
          placeholder="Buscar torre o bloque..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div className="border border-slate-200 rounded-xl bg-slate-50 p-1.5 max-h-[160px] overflow-y-auto space-y-1.5">
        {Object.keys(hierarchy).length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No se encontraron resultados</p>
        ) : (
          Object.entries(hierarchy).map(([struct, levels]) => (
            <div key={struct} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Structure Header */}
          <div className="flex items-center gap-2 p-3 hover:bg-slate-50 transition-colors">
            <button 
              type="button" 
              onClick={() => toggleStruct(struct)}
              className="p-1 hover:bg-slate-200 rounded"
            >
              {expandedStructs[struct] ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
            </button>
            <div 
              className="flex-1 flex items-center gap-2 cursor-pointer" 
              onClick={() => handleSelect(struct, !isSelected(struct))}
            >
              {isSelected(struct) ? <CheckSquare className="w-4 h-4 text-[var(--tenant-primary)]" /> : <Square className="w-4 h-4 text-slate-300" />}
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold text-slate-800">{struct}</span>
            </div>
          </div>

          {/* Levels */}
          {expandedStructs[struct] && (
            <div className="pl-8 pr-3 pb-3 space-y-1 bg-slate-50/50 border-t border-slate-100">
              {Object.entries(levels).map(([level, units]) => {
                const levelKey = `${struct}-${level}`;
                return (
                  <div key={levelKey} className="pt-2">
                    <div className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded transition-colors">
                      <button 
                        type="button" 
                        onClick={() => toggleLevel(struct, level)}
                        className="p-0.5 hover:bg-slate-200 rounded"
                      >
                        {expandedLevels[levelKey] ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                      </button>
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs font-semibold text-slate-700">Piso {level}</span>
                    </div>

                    {/* Units */}
                    {expandedLevels[levelKey] && (
                      <div className="pl-7 pr-2 pt-1 grid grid-cols-2 gap-1.5">
                        {units.map(u => {
                          const unitVal = u.path || u.name;
                          return (
                            <div 
                              key={u.id}
                              onClick={() => handleSelect(unitVal, !isSelected(unitVal))}
                              className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors border ${
                                isSelected(unitVal) 
                                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                  : 'bg-white border-slate-200 hover:border-blue-300 text-slate-600'
                              }`}
                            >
                              {isSelected(unitVal) ? <CheckSquare className="w-3.5 h-3.5 shrink-0" /> : <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                              <Home className="w-3 h-3 opacity-50 shrink-0" />
                              <span className="text-xs font-medium truncate">{u.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        ))
      )}
      </div>
    </div>
  );
};
