import React, { useState, useMemo } from "react";
import { X, Search, UserPlus, Copy, Building2, Check, ChevronRight, ChevronDown } from "lucide-react";
import { useData } from "../../../../contexts/DataContext";
import { notificationService } from "../../../../services/notificationService";
import { residentInvitationService } from "../../../../services/residentInvitationService";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "../../../../utils/cn";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const BulkInvitationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { properties } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [expandedStructure, setExpandedStructure] = useState<string | null>(null);

  const vacants = useMemo(() => properties.filter(p => p.status === 'VACANT'), [properties]);

  const filtered = useMemo(() => {
    if (!searchTerm) return vacants;
    const term = searchTerm.toLowerCase();
    return vacants.filter(p => 
      p.name?.toLowerCase().includes(term) || 
      p.number?.toLowerCase().includes(term) || 
      p.structureName?.toLowerCase().includes(term)
    );
  }, [vacants, searchTerm]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc, p) => {
      const key = p.structureName || "Sin estructura";
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {} as Record<string, typeof properties>);
  }, [filtered]);

  const selectedProperties = useMemo(() => {
    return properties.filter(p => selectedIds.includes(p.id));
  }, [properties, selectedIds]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (selectedIds.length === 0) return;
    
    const mainPropertyId = selectedIds[0];
    const additionalIds = selectedIds.slice(1);
    
    try {
      setLoading(true);
      const newInv = await residentInvitationService.generateInvitation(mainPropertyId, additionalIds);
      if (newInv.link) {
        setGeneratedLink(newInv.link);
        notificationService.showToast("Invitación múltiple generada", "success");
      }
    } catch (err) {
      notificationService.showToast("Error al generar invitación", "error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      notificationService.showToast("Enlace copiado al portapapeles", "success");
    }
  };

  const resetAndClose = () => {
    setSearchTerm("");
    setSelectedIds([]);
    setGeneratedLink(null);
    setExpandedStructure(null);
    onClose();
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };

  const isStructureFullySelected = (structProps: typeof properties) => {
    return structProps.length > 0 && structProps.every(p => selectedIds.includes(p.id));
  };

  const toggleStructureSelection = (structProps: typeof properties, e: React.MouseEvent) => {
    e.stopPropagation();
    const allSelected = isStructureFullySelected(structProps);
    if (allSelected) {
      const idsToRemove = structProps.map(p => p.id);
      setSelectedIds(prev => prev.filter(id => !idsToRemove.includes(id)));
    } else {
      const idsToAdd = structProps.map(p => p.id).filter(id => !selectedIds.includes(id));
      setSelectedIds(prev => [...prev, ...idsToAdd]);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Generar Invitación Múltiple
          </h3>
          <button onClick={resetAndClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex flex-1 overflow-hidden">
          
          {generatedLink ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 overflow-y-auto">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <UserPlus className="w-10 h-10 text-green-600" />
              </div>
              <h4 className="text-2xl font-bold text-slate-800 mb-2">¡Enlace Generado Exitosamente!</h4>
              <p className="text-slate-500 text-center max-w-md mb-8">
                Comparte este QR o enlace con el propietario. Al registrarse, se le asignarán automáticamente las <b>{selectedIds.length} propiedades</b> que seleccionaste.
              </p>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8">
                <QRCodeSVG value={generatedLink} size={220} />
              </div>

              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                <Copy className="w-5 h-5" />
                Copiar Enlace de Registro
              </button>
            </div>
          ) : (
            <>
              {/* LEFT COLUMN: EXPLORER */}
              <div className="flex-1 flex flex-col border-r border-slate-100 bg-white">
                <div className="p-4 border-b border-slate-100">
                  <p className="text-sm text-slate-500 mb-4">
                    Explora las torres y selecciona los apartamentos vacantes que deseas asignar al mismo propietario.
                  </p>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Buscar por torre o apartamento..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-shadow"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                  {Object.keys(grouped).length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-12 flex flex-col items-center">
                      <Building2 className="w-12 h-12 text-slate-200 mb-3" />
                      No hay propiedades vacantes disponibles.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(grouped).map(([structure, props]) => {
                        const isExpanded = expandedStructure === structure || searchTerm.length > 0;
                        const allSelected = isStructureFullySelected(props);
                        const someSelected = props.some(p => selectedIds.includes(p.id)) && !allSelected;

                        return (
                          <div key={structure} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all hover:border-blue-200">
                            <div 
                              onClick={() => setExpandedStructure(isExpanded ? null : structure)}
                              className="px-4 py-3 cursor-pointer flex items-center justify-between select-none hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors", isExpanded ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500")}>
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800 text-sm">{structure}</div>
                                  <div className="text-xs text-slate-400">{props.length} vacantes</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <button 
                                  onClick={(e) => toggleStructureSelection(props, e)}
                                  className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors hover:bg-blue-50 text-blue-600"
                                >
                                  <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                    allSelected ? "bg-blue-600 border-blue-600 text-white" : 
                                    someSelected ? "bg-blue-100 border-blue-600 text-blue-600" : "border-slate-300 bg-white"
                                  )}>
                                    {allSelected ? <Check className="w-3 h-3" /> : someSelected ? <div className="w-2 h-0.5 bg-blue-600 rounded-full" /> : null}
                                  </div>
                                  <span className="hidden sm:inline">{allSelected ? "Deseleccionar" : "Seleccionar todos"}</span>
                                </button>
                                {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                              </div>
                            </div>

                            {isExpanded && (
  <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-4">
    {(() => {
      // Group properties by level
      const byLevel = props.reduce<Record<string, any[]>>((acc, p) => {
        const lvl = String(p.level || '0');
        if (!acc[lvl]) acc[lvl] = [];
        acc[lvl].push(p);
        return acc;
      }, {});

      // Sort levels descending (assuming numeric or "Piso X")
      const levels = Object.keys(byLevel).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numB - numA;
      });

      return levels.map(lvl => (
        <div key={lvl} className="flex gap-4">
          <div className="w-16 shrink-0 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
            {String(lvl).toLowerCase().includes('piso') ? lvl : `Piso ${lvl}`}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {byLevel[lvl].map((p: any) => {
              const isSelected = selectedIds.includes(p.id);
              return (
                <div 
                  key={p.id}
                  onClick={() => toggleSelection(p.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    isSelected 
                      ? "bg-blue-50 border-blue-200 shadow-sm" 
                      : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0",
                    isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-slate-50"
                  )}>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{p.name || p.number}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ));
    })()}
  </div>
)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: SELECTION CART */}
              <div className="w-80 bg-slate-50 flex flex-col">
                <div className="p-5 border-b border-slate-200/60">
                  <h4 className="font-bold text-slate-800 flex items-center justify-between">
                    <span>Seleccionados</span>
                    <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs">
                      {selectedIds.length}
                    </span>
                  </h4>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  {selectedProperties.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-8 px-4 flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <Check className="w-5 h-5 text-slate-300" />
                      </div>
                      Selecciona propiedades en el panel izquierdo para añadirlas a la invitación.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedProperties.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                          <div>
                            <div className="text-sm font-bold text-slate-800">{p.name || p.number}</div>
                            <div className="text-[11px] font-medium text-slate-500">{p.structureName} - {String(p.level || 'N/A').toLowerCase().includes('piso') ? p.level : `Piso ${p.level}`}</div>
                          </div>
                          <button 
                            onClick={() => toggleSelection(p.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-5 bg-white border-t border-slate-200">
                  <button 
                    onClick={handleGenerate}
                    disabled={selectedIds.length === 0 || loading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus className="w-5 h-5" />}
                    Generar Invitación ({selectedIds.length})
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
