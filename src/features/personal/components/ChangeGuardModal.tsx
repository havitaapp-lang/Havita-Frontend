import React, { useState, useEffect } from 'react';
import { UserCheck, X, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { shiftService } from '../services/shiftService';
import type { Shift, PersonalMember } from '../types/personal.types';
import { notificationService } from '../../../services/notificationService';

interface ChangeGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shift: Shift | null;
}

export const ChangeGuardModal: React.FC<ChangeGuardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  shift,
}) => {
  const [eligibleGuards, setEligibleGuards] = useState<PersonalMember[]>([]);
  const [selectedGuardId, setSelectedGuardId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    shiftService.getEligibleGuards().then((guards) => {
      // Exclude the current guard from options if assigned
      const filtered = guards.filter((g) => g.id !== shift?.memberId);
      setEligibleGuards(filtered);
      if (filtered.length > 0) {
        setSelectedGuardId(filtered[0].id);
      }
    });
  }, [shift]);

  if (!isOpen || !shift) return null;

  const currentGuardName = shift.memberName || 'Sin asignar';
  const newGuard = eligibleGuards.find((g) => g.id === selectedGuardId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuard) return;

    setIsSubmitting(true);
    try {
      await shiftService.changeShiftGuard(
        shift.id,
        newGuard.id,
        `${newGuard.firstName} ${newGuard.lastName}`,
        newGuard.position
      );

      notificationService.showToast(
        `✓ Reasignado: ${newGuard.firstName} ${newGuard.lastName} ahora es el responsable del turno`,
        'success'
      );
      onSuccess();
      onClose();
    } catch {
      notificationService.showError('Error', 'No se pudo cambiar el guarda');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-5 pb-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-[var(--tenant-primary)] flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Cambiar guarda de turno</h3>
              <p className="text-xs text-slate-400">
                Relevo de responsabilidad para puesto {shift.gate || 'Portería Principal'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">¿Cambiar el responsable de este turno? </span>
              El nuevo guarda asumirá la marcación y el control operativo del puesto.
            </div>
          </div>

          {/* Current vs New Visual Comparison */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Guarda actual
              </span>
              <p className="text-sm font-black text-slate-900 mt-0.5">{currentGuardName}</p>
              <p className="text-[11px] text-slate-500">
                Horario: {shift.startTime} — {shift.endTime} · {shift.gate}
              </p>
            </div>

            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold py-1">
              <span className="h-px bg-slate-200 flex-1" />
              <ArrowRight className="w-4 h-4 text-blue-600" />
              <span className="h-px bg-slate-200 flex-1" />
            </div>

            <div>
              <label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                Nuevo guarda responsable
              </label>
              <select
                value={selectedGuardId}
                onChange={(e) => setSelectedGuardId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-blue-300 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-900"
              >
                {eligibleGuards.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.firstName} {g.lastName} ({g.position} · {g.company || 'Directo'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer min-h-[48px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedGuardId}
              className="flex-1 py-3 px-4 rounded-2xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-black text-xs shadow-md hover:shadow-lg transition-all cursor-pointer min-h-[48px] flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Confirmar cambio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
