import React, { useEffect, useState } from 'react';
import { 
  X, User, Car, PawPrint, Edit, Phone, Mail, Trash2, UserPlus
} from 'lucide-react';
import type { PropertyUnit } from '../../../../types';
import { apiClient } from '../../../../api/apiClient';
import { propertiesService } from '../../../../services/propertiesService';
import { cn } from '../../../../utils/cn';
import { ResidentInvitationModal } from './ResidentInvitationModal';
import { ResidentAssignModal } from './ResidentAssignModal';
import { PropertyTransferModal } from './PropertyTransferModal';
import { ArrowRightLeft, History } from 'lucide-react';
import { useData } from '../../../../contexts/DataContext';
import { getStatusLabel } from '../../../../utils/statusLabels';

interface PropertyDrawerProps {
  property: PropertyUnit | null;
  onClose: () => void;
  onEdit: (property: PropertyUnit) => void;
  onDelete?: (id: string, name: string) => void;
}

export const PropertyDrawer: React.FC<PropertyDrawerProps> = ({
  property,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"details"|"history">("details");
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { residents } = useData();

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  
  useEffect(() => {
    if (activeTab === 'history' && property?.id) {
      const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
          const res = await apiClient.get<any>(`/properties/${property.id}/history`);
          setHistory(res?.data || res || []);
        } catch(e) {
          console.error(e);
        } finally {
          setIsLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [activeTab, property?.id]);

  if (!property) return null;

  const detail = propertiesService.enrichPropertyDetail(property);
  // Reemplazar occupants simulados por los residentes reales de DataContext
  // r.propertyId podría tener el UUID o el propertyNumber dependiendo del mapper en DataContext
  const realOccupants = residents.filter(
    (r: any) =>
      r.propertyUuid === property.id ||
      r.propertyId === property.id ||
      r.propertyId === property.number ||
      r.propertyNumber === property.number ||
      r.propertyId === property.name
  );
  const occupantsToDisplay = realOccupants.length > 0 ? realOccupants : detail.occupants;

  const isOccupied = property.status === 'OCCUPIED';
  const isVacant = property.status === 'VACANT';
  const isMaintenance = property.status === 'MAINTENANCE';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform animate-in slide-in-from-right duration-200">
          
          
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              <button 
                className={`flex-1 py-3 text-sm font-bold ${activeTab === 'details' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500'}`}
                onClick={() => setActiveTab('details')}
              >
                Detalles
              </button>
              <button 
                className={`flex-1 py-3 text-sm font-bold ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500'}`}
                onClick={() => setActiveTab('history')}
              >
                Historial
              </button>
            </div>

            {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  {detail.structureName} · {/^(piso|nivel|s[oó]tano|etapa)\b/i.test(String(detail.level)) ? detail.level : 'Piso ' + detail.level}
                </span>
                <span className={cn(
                  "text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                  isOccupied && "bg-emerald-100 text-emerald-800",
                  isVacant && "bg-amber-100 text-amber-800",
                  isMaintenance && "bg-orange-100 text-orange-800",
                  property.status === 'INACTIVE' && "bg-slate-200 text-slate-700"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isOccupied && "bg-emerald-500",
                    isVacant && "bg-amber-500",
                    isMaintenance && "bg-orange-500",
                    property.status === 'INACTIVE' && "bg-slate-400"
                  )} />
                  {getStatusLabel(property.status)}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight" id="slide-over-title">
                {property.name}
              </h2>
            </div>

            <div className="flex items-center gap-1">
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(property.id, property.name)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Eliminar propiedad"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onEdit(property)}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                title="Editar propiedad"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Cerrar panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
            {activeTab === 'details' ? (
              <>
            
            {/* Technical specs grid */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Ficha Técnica del Inmueble
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">Tipo</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">{property.type}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">Área Construida</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">{detail.area ? `${detail.area} m²` : '-'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">Habitaciones</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">{detail.bedrooms ? `${detail.bedrooms} alcobas` : '-'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">Baños</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">{detail.bathrooms ? `${detail.bathrooms} baños` : '-'}</div>
                </div>
              </div>
            </div>

            {/* Resident Information */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span>Residentes Registrados</span>
                  <User className="w-4 h-4 text-slate-400" />
                </h4>
                
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer mr-2"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Asignar Existente</span>
                  </button>
                    <button
                      type="button"
                      onClick={() => setIsTransferModalOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer mr-2"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Cambiar Propietario</span>
                    </button>
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invitar Residente</span>
                </button>
              </div>

              {occupantsToDisplay && occupantsToDisplay.length > 0 ? (
                <div className="space-y-2.5">
                  {occupantsToDisplay.map((occ, idx) => (
                    <div key={idx} className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{occ.name}</div>
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md inline-block mt-1">
                          {occ.type}
                        </span>
                        <div className="mt-2 space-y-1 text-xs text-slate-600">
                          {occ.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{occ.phone}</span>
                            </div>
                          )}
                          {occ.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate max-w-[200px]">{occ.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-center border border-slate-100">
                  <p className="text-xs text-slate-500 mb-3">
                    Sin residente registrado. Esta propiedad figura como vacante o desocupada.
                  </p>
                  
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer mr-2"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Asignar Existente</span>
                  </button>
                    <button
                      type="button"
                      onClick={() => setIsTransferModalOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer mr-2"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Cambiar Propietario</span>
                    </button>
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Generar Enlace de Registro</span>
                  </button>
                </div>
              )}
            </div>

            {/* Vehicles Information */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                <span>Vehículos y Parqueaderos</span>
                <Car className="w-4 h-4 text-slate-400" />
              </h4>

              {detail.vehicles && detail.vehicles.length > 0 ? (
                <div className="space-y-2">
                  {detail.vehicles.map((veh, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-sm bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                          {veh.plate}
                        </span>
                        <div className="text-slate-500 mt-1">{veh.brandModel}</div>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium bg-slate-200/60 px-2 py-1 rounded-md">
                        {veh.parkingSpot || 'Sin asignar'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-400 border border-slate-100">
                  No hay vehículos registrados para esta unidad.
                </div>
              )}
            </div>

            {/* Pets Information */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                <span>Mascotas</span>
                <PawPrint className="w-4 h-4 text-slate-400" />
              </h4>

              {detail.pets && detail.pets.length > 0 ? (
                <div className="space-y-2">
                  {detail.pets.map((pet, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <PawPrint className="w-4 h-4 text-amber-600" />
                        <div>
                          <div className="font-bold text-slate-800">{pet.name}</div>
                          <div className="text-slate-400 text-[11px]">{pet.breed}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        {pet.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-400 border border-slate-100">
                  No hay mascotas registradas.
                </div>
              )}
            </div>

          </>
            ) : (
              <div className="space-y-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center justify-between">
                  <span>Historial de Residentes</span>
                  <History className="w-4 h-4 text-slate-400" />
                </h4>
                {isLoadingHistory ? (
                  <div className="text-center p-6 text-slate-400">Cargando historial...</div>
                ) : history.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center border border-slate-100 text-slate-500">
                    No hay registros historicos para esta propiedad.
                  </div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {history.map((record, i) => (
                      <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800">{record.name}</span>
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full",
                              record.status === 'ACTIVE' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                            )}>{getStatusLabel(record.status)}</span>
                          </div>
                          <div className="text-xs text-slate-500 mb-2">{record.type} {record.documentId ? ` - ${record.documentId}` : ''}</div>
                          <div className="flex justify-between items-end text-[10px] text-slate-400 font-medium">
                            <div>
                              <div>Ingreso: {record.registeredAt ? new Date(record.registeredAt).toLocaleDateString() : '-'}</div>
                              {record.endedAt && <div>Salida: {new Date(record.endedAt).toLocaleDateString()}</div>}
                            </div>
                            {record.endReason && (
                              <div className="text-right max-w-[50%] truncate text-slate-500">Razón: {record.endReason}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Drawer Actions Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onEdit(property)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Edit className="w-4 h-4" />
              <span>Editar Propiedad</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>

        </div>
      </div>
      
      
        {property && (
          <ResidentInvitationModal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            property={property}
          />
        )}
        {property && (
          <ResidentAssignModal
            isOpen={isAssignModalOpen}
            onClose={() => setIsAssignModalOpen(false)}
            property={property}
          />
        )}
  
    
        {isTransferModalOpen && property && (
          <PropertyTransferModal
            property={property}
            onClose={() => setIsTransferModalOpen(false)}
            onSuccess={() => {
              // Trigger reload or just wait for SSE
            }}
          />
        )}
</div>
  );
};
