import { Clock, ShieldCheck, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import type { Shift } from '../../personal/types/personal.types';

interface GuardClockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (simulatedTime?: string, isLate?: boolean) => void;
  shift: Shift;
  currentTimeStr: string;
  isEarly: boolean;
  isLate: boolean;
  diffMinutes: number;
}

export const GuardClockInModal: React.FC<GuardClockInModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  shift,
  currentTimeStr,
  isEarly,
  isLate,
  diffMinutes,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 transform transition-all">
        {/* Header */}
        <div className="p-5 pb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">¿Registrar entrada?</h3>
              <p className="text-xs text-blue-100">Confirmación de inicio de turno en portería</p>
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
          {/* Timing condition alert */}
          {isEarly && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs text-blue-800">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold">Entrada anticipada: </span>
                Tu turno comienza en {diffMinutes} minutos. Se registrará tu hora real de ingreso.
              </div>
            </div>
          )}

          {isLate && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Entrada tardía: </span>
                Tu turno comenzó hace {diffMinutes} minutos. El registro marcará novedad de tardanza.
              </div>
            </div>
          )}

          {!isEarly && !isLate && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Horario puntual: </span>
                Estás dentro del tiempo ideal para tomar el relevo del puesto.
              </div>
            </div>
          )}

          {/* Shift Details Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Turno programado:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {shift.startTime} — {shift.endTime}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Puesto de control:</span>
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                {shift.gate || 'Portería Principal'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-700 font-bold">Hora actual a registrar:</span>
              <span className="font-mono font-black text-base text-[var(--tenant-primary)] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
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
              onClick={() => onConfirm(currentTimeStr, isLate)}
              className="flex-1 py-3 px-4 rounded-2xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-black text-xs shadow-md hover:shadow-lg transition-all cursor-pointer min-h-[48px] flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar entrada
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
