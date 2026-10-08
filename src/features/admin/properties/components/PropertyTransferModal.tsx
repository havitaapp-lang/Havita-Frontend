import React, { useState } from 'react';
import { X, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import type { PropertyUnit } from '../../../../types';
import { apiClient } from '../../../../api/apiClient';
import { notificationService } from '../../../../services/notificationService';

interface PropertyTransferModalProps {
  property: PropertyUnit;
  onClose: () => void;
  onSuccess: () => void;
}

export const PropertyTransferModal: React.FC<PropertyTransferModalProps> = ({
  property, onClose, onSuccess
}) => {
  const [formData, setFormData] = useState({
    newOwnerName: '',
    newOwnerEmail: '',
    newOwnerPhone: '',
    newOwnerDocumentId: '',
    reason: 'OWNERSHIP_TRANSFER',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiClient.post<any>(`/properties/${property.id}/transfer-owner`, {
        ...formData,
        effectiveDate: new Date().toISOString()
      });
      
      // Axios usually puts JSON in res.data, fetch wrappers might return it directly
      const responseData = res?.data || res;
      
      if (responseData?.inviteLink) {
        setInviteLink(responseData.inviteLink);
        notificationService.showToast("Transferencia completada. Enlace generado.", "success");
      } else {
        notificationService.showToast("Propiedad transferida exitosamente", "success");
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Error al transferir la propiedad');
    } finally {
      setIsSubmitting(false);
    }
  };

  
  if (inviteLink) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">¡Transferencia Exitosa!</h2>
          <p className="text-sm text-slate-600 mb-6">El nuevo propietario ha sido registrado. Copia el siguiente enlace y envíaselo para que cree su contraseña y acceda a la plataforma.</p>
          
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 mb-6">
            <span className="text-xs text-slate-600 font-mono truncate">{inviteLink}</span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
                notificationService.showToast("Enlace copiado", "success");
              }}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors"
            >
              Copiar
            </button>
          </div>
          
          <button
            onClick={() => {
              onSuccess();
              onClose();
            }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
          >
            Finalizar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center gap-3 text-amber-700">
            <ArrowRightLeft className="w-5 h-5" />
            <h2 className="text-lg font-bold">Transferir Propiedad</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="p-4 sm:p-6 overflow-y-auto">
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Esta acción terminará el contrato del <strong>Propietario actual</strong> de la propiedad <strong>{property.number} - {property.name}</strong> 
                y anulará delegaciones futuras. No afectará a arrendatarios ni el historial.
              </p>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del nuevo Propietario *</label>
                <input required type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  value={formData.newOwnerName} onChange={e => setFormData(f => ({ ...f, newOwnerName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                <input type="email" className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  value={formData.newOwnerEmail} onChange={e => setFormData(f => ({ ...f, newOwnerEmail: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Documento</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    value={formData.newOwnerDocumentId} onChange={e => setFormData(f => ({ ...f, newOwnerDocumentId: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono</label>
                  <input type="tel" className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    value={formData.newOwnerPhone} onChange={e => setFormData(f => ({ ...f, newOwnerPhone: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end mt-auto">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              <span>Confirmar Transferencia</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
