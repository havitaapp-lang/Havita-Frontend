import { Clock, ShieldCheck, UserCheck, CalendarDays } from 'lucide-react';
import type { Shift } from '../types/personal.types';

interface ShiftsScheduleViewProps {
  shifts: Shift[];
}

export const ShiftsScheduleView: React.FC<ShiftsScheduleViewProps> = ({ shifts }) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[var(--tenant-primary)]" />
            Programación de Turnos Semanales
          </h3>
          <p className="text-xs text-slate-500">
            Horarios asignados, puestos de vigilancia y cuadrillas de mantenimiento de la copropiedad.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-2.5 py-1 bg-blue-50 text-[var(--tenant-primary)] rounded-xl font-bold border border-blue-100">
            {shifts.length} Turnos Configurados
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shifts.map((s) => (
          <div
            key={s.id}
            className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-3 hover:border-blue-200 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {s.area}
                </span>
                <h4 className="font-bold text-slate-900 text-sm mt-1">{s.shiftName}</h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {s.status}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  Titular del Turno
                </span>
                <span className="font-bold text-slate-800">{s.memberName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Horario
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {s.startTime} - {s.endTime}
                </span>
              </div>

              {s.gate && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Puesto Asignado
                  </span>
                  <span className="font-semibold text-emerald-800">{s.gate}</span>
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                Días de Operación
              </span>
              <div className="flex flex-wrap gap-1">
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day) => {
                  const isActive = Boolean(s.daysOfWeek?.includes(day));
                  return (
                    <span
                      key={day}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        isActive
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
