import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Search, XCircle, UserCheck, KeySquare, FileText, UserSquare2 } from 'lucide-react';
import { assemblyService } from '../services/assemblyService';
import { propertyApi } from '../../../api/propertyApi';
import { notificationService } from '../../../services/notificationService';
import type { Assembly } from '../types/assembly.types';

interface AssemblyAttendanceListProps {
  assembly: Assembly;
}

export const AssemblyAttendanceList = ({ assembly }: AssemblyAttendanceListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Queries
  const { data: properties = [], isLoading: loadingProps } = useQuery({
    queryKey: ['votingRights', assembly.id],
    queryFn: () => assemblyService.getVotingRights(assembly.id)
  });

  const { data: attendees = [], isLoading: loadingAttendees } = useQuery({
    queryKey: ['assemblyAttendees', assembly.id],
    queryFn: () => assemblyService.getAttendees(assembly.id),
    // Polling eliminado: las actualizaciones llegan por SSE (ASSEMBLY_QUORUM_UPDATED)
  });

  // Derived state
  const attendeesMap = useMemo(() => {
    const map = new Map();
    attendees.forEach((a: any) => map.set(a.propertyId, a));
    return map;
  }, [attendees]);

  const filteredProperties = useMemo(() => {
    return properties.filter((p: any) => 
      p.propertyNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.propertyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.voterName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [properties, searchTerm]);

  // Modals & Handlers
  const handleOpenModal = (property: any) => {
    setSelectedProperty(property);
    setIsModalOpen(true);
  };

  if (loadingProps || loadingAttendees) {
    return (
      <div className="p-12 flex justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar apartamento o casa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <div className="text-sm font-bold text-slate-700 bg-slate-100 px-4 py-2 rounded-xl">
          Quórum Registrado: {attendees.length} / {properties.length}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-bold">Inmueble</th>
                <th className="px-6 py-4 font-bold">Votante Autorizado</th>
                <th className="px-6 py-4 font-bold">Estado</th>
                <th className="px-6 py-4 font-bold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProperties.map((property: any) => {
                const attendee = attendeesMap.get(property.propertyId);
                const isPresent = !!attendee;

                return (
                  <tr key={property.propertyId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{property.propertyNumber}</span>
                        <span className="text-xs text-slate-500">{property.propertyName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-bold">{property.voterName}</span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit mt-1">
                          {property.voterRole}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isPresent ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] uppercase tracking-wider w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Presente
                          </span>
                          {attendee.isPowerOfAttorney && (
                            <span className="text-[10px] text-slate-500 mt-1">
                              Por apoderado: {attendee.representativeName}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                          <XCircle className="w-3.5 h-3.5" /> Ausente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isPresent && (
                        <button
                          onClick={() => handleOpenModal(property)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                        >
                          Registrar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProperties.length === 0 && (
            <div className="p-8 text-center text-slate-500">No se encontraron inmuebles</div>
          )}
        </div>
      </div>

      {/* Manual Registration Modal */}
      {isModalOpen && selectedProperty && (
        <ManualRegistrationModal
          assemblyId={assembly.id}
          property={selectedProperty}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProperty(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['assemblyAttendees', assembly.id] });
            setIsModalOpen(false);
            setSelectedProperty(null);
          }}
        />
      )}
    </div>
  );
};

// --- Modal Component ---
const ManualRegistrationModal = ({ assemblyId, property, onClose, onSuccess }: any) => {
  const [mode, setMode] = useState<'TITULAR' | 'APODERADO'>('TITULAR');
  const [repName, setRepName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await assemblyService.registerAttendee(assemblyId, {
        propertyId: property.propertyId,
        isPowerOfAttorney: mode === 'APODERADO',
        representativeName: mode === 'APODERADO' ? repName : undefined
      });
      notificationService.showToast('Asistencia registrada correctamente', 'success');
      onSuccess();
    } catch (err: any) {
      notificationService.showToast(err.response?.data?.message || 'Error al registrar', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Registro Manual</h3>
            <p className="text-xs text-slate-500 font-medium">Inmueble: {property.propertyNumber}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('TITULAR')}
              className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'TITULAR' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserSquare2 className="w-4 h-4" />
              Titular Presente
            </button>
            <button
              type="button"
              onClick={() => setMode('APODERADO')}
              className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'APODERADO' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Tiene Apoderado
            </button>
          </div>

          {mode === 'APODERADO' && (
            <div className="space-y-2 animate-fade-in">
              <label className="text-xs font-bold text-slate-700">Nombre del Apoderado</label>
              <input
                type="text"
                required
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}
          
          {mode === 'TITULAR' && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
              <KeySquare className="w-5 h-5 text-blue-600 shrink-0" />
              <p className="text-xs text-blue-800 font-medium">
                Al registrarlo como titular, confirmas que el propietario o el residente delegado se encuentra presente en la asamblea físicamente.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-xl text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-xl text-sm transition-colors flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Registrar Asistencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

