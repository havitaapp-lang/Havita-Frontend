import { CheckCircle2, Clock, MapPin, ClipboardList } from 'lucide-react';
import type { AttendanceRecord } from '../types/personal.types';

interface AttendanceLogViewProps {
  records: AttendanceRecord[];
}

export const AttendanceLogView: React.FC<AttendanceLogViewProps> = ({ records }) => {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[var(--tenant-primary)]" />
            Bitácora de Asistencia y Minuta Operativa
          </h3>
          <p className="text-xs text-slate-500">
            Control de ingresos, relevos de turno en portería y novedades reportadas por el personal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Asistencia en tiempo real
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-3">Colaborador</th>
                <th className="py-3 px-3">Cargo & Área</th>
                <th className="py-3 px-3">Entrada</th>
                <th className="py-3 px-3">Salida</th>
                <th className="py-3 px-3">Puesto / Puerta</th>
                <th className="py-3 px-3">Puntualidad</th>
                <th className="py-3 px-4">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 font-semibold">
                    {r.date}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-slate-900">
                    {r.memberName}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-slate-800 font-medium">{r.position}</span>
                    <span className="block text-[10px] text-slate-400">{r.area}</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-emerald-700">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-500" />
                      {r.checkIn}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-500">
                    {r.checkOut || <span className="text-blue-600 font-bold text-[10px] bg-blue-50 px-2 py-0.5 rounded">En turno</span>}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">
                    {r.gate ? (
                      <span className="flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {r.gate}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Predio general</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {r.status === 'PRESENTE' ? 'A tiempo' : r.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                    {r.observations || 'Sin novedades registradas.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
