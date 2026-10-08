import { ClipboardList, X, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import type { AttendanceRecord } from '../../personal/types/personal.types';

interface GuardAttendanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AttendanceRecord[];
  guardName: string;
}

export const GuardAttendanceHistoryModal: React.FC<GuardAttendanceHistoryModalProps> = ({
  isOpen,
  onClose,
  records,
  guardName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 pb-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Mis marcaciones</h3>
              <p className="text-xs text-slate-400">
                Historial de asistencia y puntualidad de {guardName}
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
        <div className="p-5 overflow-y-auto space-y-4">
          {records.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No tienes marcaciones anteriores registradas.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
              {records.map((r) => {
                const isPresent = r.status === 'PRESENTE';
                const isLate = r.status === 'TARDANZA';
                const isAbsent = r.status === 'AUSENTE';

                return (
                  <div key={r.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded">
                          {r.date}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          Turno {r.scheduledCheckIn || '06:00'} — {r.scheduledCheckOut || '18:00'}
                        </span>
                        {r.gate && (
                          <span className="text-[11px] text-slate-400">· {r.gate}</span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isPresent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ✓ Completo
                          </span>
                        )}
                        {isLate && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            ⚠ Tardanza
                          </span>
                        )}
                        {isAbsent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" />
                            🔴 Ausente
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comparison Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Entr. Programada</span>
                        <span className="font-mono font-bold text-slate-700">
                          {r.scheduledCheckIn || '06:00'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Entr. Real</span>
                        <span
                          className={`font-mono font-bold ${
                            isAbsent
                              ? 'text-slate-400'
                              : isLate
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {r.checkIn ? (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {r.checkIn}
                            </span>
                          ) : (
                            '—'
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Salida Programada</span>
                        <span className="font-mono font-bold text-slate-700">
                          {r.scheduledCheckOut || '18:00'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Salida Real</span>
                        <span className="font-mono font-bold text-slate-800">
                          {r.checkOut || (r.checkIn ? 'En turno' : '—')}
                        </span>
                      </div>
                    </div>

                    {r.observations && (
                      <p className="text-[11px] text-slate-500 mt-2 italic">
                        Nota: {r.observations}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
