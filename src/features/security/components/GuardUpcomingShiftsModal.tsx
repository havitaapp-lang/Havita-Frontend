import { CalendarDays, X, ShieldCheck, Clock, MapPin } from 'lucide-react';
import type { Shift } from '../../personal/types/personal.types';

interface GuardUpcomingShiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  upcomingShifts: {
    today: Shift[];
    tomorrow: Shift[];
    thisWeek: Shift[];
  };
  guardName: string;
}

export const GuardUpcomingShiftsModal: React.FC<GuardUpcomingShiftsModalProps> = ({
  isOpen,
  onClose,
  upcomingShifts,
  guardName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 pb-4 bg-[var(--tenant-primary)] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Próximos turnos</h3>
              <p className="text-xs text-blue-100">
                Programación oficial para {guardName}
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Section: HOY */}
          <div>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-2">
              Hoy
            </span>
            {upcomingShifts.today.length === 0 ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl text-xs text-slate-500">
                No tienes más turnos programados para el día de hoy.
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingShifts.today.map((s) => (
                  <ShiftCard key={s.id} shift={s} isToday />
                ))}
              </div>
            )}
          </div>

          {/* Section: MAÑANA */}
          <div>
            <span className="text-[11px] font-black text-blue-600 uppercase tracking-wider block mb-2">
              Mañana
            </span>
            {upcomingShifts.tomorrow.length === 0 ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl text-xs text-slate-500">
                Día compensatorio / Sin turno programado.
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingShifts.tomorrow.map((s) => (
                  <ShiftCard key={s.id} shift={s} />
                ))}
              </div>
            )}
          </div>

          {/* Section: ESTA SEMANA */}
          <div>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">
              Esta semana
            </span>
            {upcomingShifts.thisWeek.length === 0 ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl text-xs text-slate-500">
                No hay turnos adicionales cargados para los siguientes días.
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingShifts.thisWeek.map((s) => (
                  <ShiftCard key={s.id} shift={s} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

const ShiftCard = ({ shift, isToday }: { shift: Shift; isToday?: boolean }) => {
  return (
    <div
      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isToday
          ? 'bg-blue-50/70 border-blue-200'
          : 'bg-white border-slate-200/80 shadow-2xs hover:border-slate-300'
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {shift.date && (
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {shift.date}
            </span>
          )}
          <span className="text-xs font-bold text-slate-900">{shift.shiftName}</span>
          {shift.shiftType && (
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-100/60 px-1.5 py-0.2 rounded">
              {shift.shiftType}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1 font-mono font-bold text-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            {shift.startTime} — {shift.endTime}
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {shift.gate || 'Portería principal'}
          </span>
        </div>
      </div>

      <div className="shrink-0">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
          <ShieldCheck className="w-3.5 h-3.5" />
          Confirmado
        </span>
      </div>
    </div>
  );
};
