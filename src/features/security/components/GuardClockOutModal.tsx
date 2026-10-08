import { LogOut, Clock, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import type { Shift } from '../../personal/types/personal.types';

interface GuardClockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (simulatedExitTime?: string) => void;
  shift: Shift;
  currentTimeStr: string;
  actualCheckIn?: string;
  elapsedTimeString: string;
}

export const GuardClockOutModal: React.FC<GuardClockOutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  shift,
  currentTimeStr,
  actualCheckIn,
  elapsedTimeString,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 transform transition-all">
        {/* Header */}
        <div className="p-5 pb-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">¿Registrar salida?</h3>
              <p className="text-xs text-slate-300">Finalización formal de guardia y relevo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Cierre de turno: </span>
              Al confirmar, tu turno quedará bloqueado y se guardará la bitácora para la administración.
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Turno asignado:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {shift.startTime} — {shift.endTime}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Puesto de control:</span>
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {shift.gate || 'Portería Principal'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Entrada registrada:</span>
              <span className="font-mono font-bold text-emerald-700">
                {actualCheckIn || shift.startTime}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Tiempo total en puesto:</span>
              <span className="font-bold text-slate-900 bg-slate-200/70 px-2 py-0.5 rounded">
                {elapsedTimeString}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-700 font-bold">Hora de salida a registrar:</span>
              <span className="font-mono font-black text-base text-slate-900 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-200">
                {currentTimeStr}
              </span>
            </div>
          </div>

          {/* Action buttons (Touch target >= 44px) */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer min-h-[48px]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirm(currentTimeStr)}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md hover:shadow-lg transition-all cursor-pointer min-h-[48px] flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Confirmar salida
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
