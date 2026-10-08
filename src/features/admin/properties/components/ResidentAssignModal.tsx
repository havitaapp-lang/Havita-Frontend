import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import type { PropertyUnit, Resident } from '../../../../types';
import { residentApi } from '../../../../api/residentApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../../../services/notificationService';

interface ResidentAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: PropertyUnit;
}

export const ResidentAssignModal: React.FC<ResidentAssignModalProps> = ({ isOpen, onClose, property }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: residentPage } = useQuery({
    queryKey: ['residents', searchTerm],
    queryFn: () => residentApi.findAll(0, 50, searchTerm),
    enabled: isOpen
  });

  const { mutate: assignResident, isPending } = useMutation({
    mutationFn: (residentId: string) => residentApi.assignProperties(residentId, [property.id], 'Propietario', true),
    onSuccess: () => {
      notificationService.showToast('Residente asignado a la propiedad', 'success');
      // Invalidate both residents list and the global mock context so it updates the drawer
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      // The PropertyDrawer uses useData(), a page reload or simple timeout can help if not strictly using react-query everywhere
      setTimeout(() => window.location.reload(), 1000);
      onClose();
    },
    onError: () => {
      notificationService.showToast('Error al asignar el residente', 'error');
    }
  });

  if (!isOpen) return null;

  const residents = residentPage?.content || [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800">Asignar Residente Existente</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <p className="text-xs text-slate-500 mb-4">
            Selecciona un residente que ya est registrado en el sistema para vincularlo a <b>{property.name || property.number}</b>.
          </p>

          <div className="relative mb-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar residente por nombre o cdula..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[40vh]">
            {residents.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-4">No se encontraron residentes.</div>
            ) : (
              residents.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:border-blue-100 hover:bg-blue-50/30">
                  <div>
                    <div className="font-semibold text-sm text-slate-800">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.documentId} - {r.email}</div>
                  </div>
                  <button 
                    disabled={isPending}
                    onClick={() => assignResident(r.id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    Asignar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
