import { useState, useMemo } from 'react';
import { X, Building2, Check, Loader2, FileSpreadsheet } from 'lucide-react';
import { propertiesService } from '../../../../services/propertiesService';
import Swal from 'sweetalert2';

interface BulkPropertyWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkPropertyWizard = ({ isOpen, onClose, onSuccess }: BulkPropertyWizardProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [structureType, setStructureType] = useState('Torre');
  const [propertyType, setPropertyType] = useState('Apartamento');

  // Level 1: Structure (Torre)
  const [sGenType, setSGenType] = useState('SEQUENTIAL');
  const [sPrefix, setSPrefix] = useState('Torre ');
  const [sCount, setSCount] = useState<number | ''>(10);
  const [sStart, setSStart] = useState<number | ''>(1);
  const [sCustom, setSCustom] = useState('');

  // Level 2: Level (Piso)
  const [lGenType, setLGenType] = useState('SEQUENTIAL');
  const [lPrefix, setLPrefix] = useState('Piso ');
  const [lCount, setLCount] = useState<number | ''>(5);
  const [lStart, setLStart] = useState<number | ''>(1);
  const [lCustom, setLCustom] = useState('');

  // Level 3: Property (Apto)
  const [pGenType, setPGenType] = useState('SEQUENTIAL');
  const [pPrefix, setPPrefix] = useState('Apto ');
  const [pCount, setPCount] = useState<number | ''>(4);
  const [pStart, setPStart] = useState<number | ''>(1);
  const [pCustom, setPCustom] = useState('');

  const sValues = useMemo(() => {
    const start = Number(sStart) || 1;
    const count = Number(sCount) || 0;
    if (sGenType === 'SEQUENTIAL') return Array.from({ length: count }).map((_, i) => sPrefix + (start + i));
    return sCustom.split(/[,\n;]/).map(s => s.trim()).filter(Boolean).map(s => sPrefix + s);
  }, [sGenType, sCount, sStart, sPrefix, sCustom]);

  const lValues = useMemo(() => {
    const start = Number(lStart) || 1;
    const count = Number(lCount) || 0;
    if (lGenType === 'SEQUENTIAL') return Array.from({ length: count }).map((_, i) => lPrefix + (start + i));
    return lCustom.split(/[,\n;]/).map(s => s.trim()).filter(Boolean).map(s => lPrefix + s);
  }, [lGenType, lCount, lStart, lPrefix, lCustom]);

  const pValues = useMemo(() => {
    const start = Number(pStart) || 1;
    const count = Number(pCount) || 0;
    if (pGenType === 'SEQUENTIAL') return Array.from({ length: count }).map((_, i) => pPrefix + (start + i));
    return pCustom.split(/[,\n;]/).map(s => s.trim()).filter(Boolean).map(s => pPrefix + s);
  }, [pGenType, pCount, pStart, pPrefix, pCustom]);

  const totalProperties = sValues.length * Math.max(1, lValues.length) * pValues.length;

  if (!isOpen) return null;

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: number | '') => void) => {
    const rawValue = e.target.value;
    if (rawValue === '') {
      setter('');
      return;
    }
    const val = Math.max(1, parseInt(rawValue, 10) || 1);
    e.target.value = String(val);
    setter(val);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const payload = {
        structureType,
        propertyType,
        structure: {
          generationType: sGenType,
          count: sCount,
          startFrom: sStart,
          prefix: sPrefix,
          customValues: sGenType === 'CUSTOM' ? sCustom.split(/[,\n;]/).map(s => s.trim()).filter(Boolean) : []
        },
        level: {
          generationType: lGenType,
          count: lCount,
          startFrom: lStart,
          prefix: lPrefix,
          customValues: lGenType === 'CUSTOM' ? lCustom.split(/[,\n;]/).map(s => s.trim()).filter(Boolean) : []
        },
        property: {
          generationType: pGenType,
          count: pCount,
          startFrom: pStart,
          prefix: pPrefix,
          customValues: pGenType === 'CUSTOM' ? pCustom.split(/[,\n;]/).map(s => s.trim()).filter(Boolean) : []
        }
      };

      await propertiesService.generateBulkProperties(payload);
      onSuccess();
    } catch (err: any) {
      Swal.fire({
        title: 'Error de Validación',
        text: err.message || 'Ocurrió un error al generar las propiedades',
        icon: 'error',
        confirmButtonColor: '#2563EB',
        confirmButtonText: 'Entendido'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Creación Masiva de Propiedades</h2>
            <p className="text-sm text-slate-500">Configura la estructura para generar cientos de propiedades automáticamente.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* ESTRUCTURA PRINCIPAL */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-blue-600">
                <Building2 className="w-5 h-5" />
                <h3 className="font-semibold text-slate-800">Estructura Base</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Estructura</label>
                  <select 
                    value={structureType} onChange={e => setStructureType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Torre">Torre</option>
                    <option value="Bloque">Bloque</option>
                    <option value="Manzana">Manzana</option>
                    <option value="Etapa">Etapa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Prefijo Nomenclatura</label>
                  <input type="text" value={sPrefix} onChange={e => setSPrefix(e.target.value)} placeholder="Ej. Torre " className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Modo de Generación</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setSGenType('SEQUENTIAL')} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${sGenType === 'SEQUENTIAL' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Consecutivo</button>
                    <button onClick={() => setSGenType('CUSTOM')} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${sGenType === 'CUSTOM' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Personalizado</button>
                  </div>
                </div>

                {sGenType === 'SEQUENTIAL' ? (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Desde el #</label>
                      <input type="number" value={sStart} onChange={e => handleNumberChange(e, setSStart)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad</label>
                      <input type="number" value={sCount} onChange={e => handleNumberChange(e, setSCount)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Valores (separados por coma)</label>
                    <textarea value={sCustom} onChange={e => setSCustom(e.target.value)} placeholder="Ej. A, B, C, D" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm h-20 resize-none"></textarea>
                  </div>
                )}
              </div>
            </div>

            {/* NIVEL (PISO) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-emerald-600">
                <FileSpreadsheet className="w-5 h-5" />
                <h3 className="font-semibold text-slate-800">Sub-Nivel (Opcional)</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Prefijo Nomenclatura</label>
                  <input type="text" value={lPrefix} onChange={e => setLPrefix(e.target.value)} placeholder="Ej. Piso " className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Modo de Generación</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setLGenType('SEQUENTIAL')} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${lGenType === 'SEQUENTIAL' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Consecutivo</button>
                    <button onClick={() => setLGenType('CUSTOM')} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${lGenType === 'CUSTOM' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Personalizado</button>
                  </div>
                </div>

                {lGenType === 'SEQUENTIAL' ? (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Desde el #</label>
                      <input type="number" value={lStart} onChange={e => handleNumberChange(e, setLStart)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad</label>
                      <input type="number" value={lCount} onChange={e => handleNumberChange(e, setLCount)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Valores (separados por coma)</label>
                    <textarea value={lCustom} onChange={e => setLCustom(e.target.value)} placeholder="Ej. 1, 2, 3" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm h-20 resize-none"></textarea>
                  </div>
                )}
              </div>
            </div>

            {/* PROPIEDAD */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-purple-600">
                <Check className="w-5 h-5" />
                <h3 className="font-semibold text-slate-800">Propiedad</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Propiedad</label>
                  <select 
                    value={propertyType} onChange={e => setPropertyType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="Apartamento">Apartamento</option>
                    <option value="Casa">Casa</option>
                    <option value="Local">Local</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Prefijo Nomenclatura</label>
                  <input type="text" value={pPrefix} onChange={e => setPPrefix(e.target.value)} placeholder="Ej. Apto " className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Modo de Generación</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setPGenType('SEQUENTIAL')} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${pGenType === 'SEQUENTIAL' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Consecutivo</button>
                    <button onClick={() => setPGenType('CUSTOM')} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${pGenType === 'CUSTOM' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Personalizado</button>
                  </div>
                </div>

                {pGenType === 'SEQUENTIAL' ? (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Desde el #</label>
                      <input type="number" value={pStart} onChange={e => handleNumberChange(e, setPStart)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad</label>
                      <input type="number" value={pCount} onChange={e => handleNumberChange(e, setPCount)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Valores (separados por coma)</label>
                    <textarea value={pCustom} onChange={e => setPCustom(e.target.value)} placeholder="Ej. 101, 102, 103" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm h-20 resize-none"></textarea>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="mt-8 bg-blue-50/50 border border-blue-100 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-slate-800 mb-4">Vista Previa (Muestra)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {sValues.slice(0, 2).map((s, i) => (
                <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="font-bold text-slate-700 text-xs border-b pb-1 mb-2">{s}</div>
                  {lValues.slice(0, 2).map((l, j) => (
                    <div key={j} className="mb-2">
                      <div className="text-xs font-semibold text-slate-500 ml-2">{l}</div>
                      <div className="ml-4 space-y-1 mt-1">
                        {pValues.slice(0, 3).map((p, k) => (
                          <div key={k} className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{p}</div>
                        ))}
                        {pValues.length > 3 && <div className="text-[10px] text-slate-400 ml-1">... y {pValues.length - 3} más</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {sValues.length > 2 && (
                <div className="flex items-center justify-center bg-white/50 border border-dashed border-slate-300 rounded-lg p-3">
                  <span className="text-sm text-slate-500 font-medium">+ {sValues.length - 2} {structureType}s más</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center">
          <div className="text-sm">
            <span className="text-slate-500">Se generarán en total:</span>
            <span className="ml-2 font-bold text-blue-600 text-lg">{totalProperties} propiedades</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancelar
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || totalProperties === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Generar {totalProperties} Propiedades
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

