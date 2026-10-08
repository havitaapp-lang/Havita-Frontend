import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  Calendar,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { attendanceService } from '../services/attendanceService';
import type { AttendanceRecord, TodayAttendanceKpis } from '../types/personal.types';
import { notificationService } from '../../../services/notificationService';

export const AdminAttendancePage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [kpis, setKpis] = useState<TodayAttendanceKpis>({
    totalTodayShifts: 12,
    presentCount: 10,
    pendingCount: 1,
    absentCount: 1,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('2026-09-14');
  const [memberFilter, setMemberFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [gateFilter, setGateFilter] = useState('ALL');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await attendanceService.getAllRecords({
        date: dateFilter || undefined,
        memberId: memberFilter,
        area: areaFilter,
        status: statusFilter,
        gate: gateFilter,
        search,
      });
      setRecords(list);

      const metrics = await attendanceService.getTodayAttendanceKpis();
      setKpis(metrics);
    } catch {
      notificationService.showError('Error', 'No se pudieron cargar los registros');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, memberFilter, areaFilter, statusFilter, gateFilter, search]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('havita_attendance_changed', handleUpdate);
    window.addEventListener('havita_shifts_changed', handleUpdate);

    return () => {
      window.removeEventListener('havita_attendance_changed', handleUpdate);
      window.removeEventListener('havita_shifts_changed', handleUpdate);
    };
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Personal & Minuta
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2 mt-0.5">
            <ClipboardList className="w-7 h-7 text-[var(--tenant-primary)]" />
            Control de Asistencia del Personal
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Registro auditable de marcaciones de entrada y salida, puntualidad y reporte de novedades.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sincronización en vivo con Portería
          </span>
        </div>
      </div>

      {/* SECTION 21: MÉTRICAS SIMPLES DE ASISTENCIA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[var(--tenant-primary)] flex items-center justify-center mb-2">
            <Calendar className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            Turnos de Hoy
          </p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{kpis.totalTodayShifts}</p>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            Presentes
          </p>
          <p className="text-2xl font-black text-emerald-700 mt-0.5">{kpis.presentCount}</p>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            Pendientes
          </p>
          <p className="text-2xl font-black text-amber-700 mt-0.5">{kpis.pendingCount}</p>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2">
            <XCircle className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            Ausentes
          </p>
          <p className="text-2xl font-black text-rose-700 mt-0.5">{kpis.absentCount}</p>
        </div>
      </div>

      {/* FILTROS (REQUERIMIENTO 20: Fecha, Empleado, Área, Estado, Portería) */}
      <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cargo, puesto u observaciones..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* Fecha */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Fecha</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none"
            />
          </div>

          {/* Empleado */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Colaborador</label>
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none"
            >
              <option value="ALL">Todos los Colaboradores</option>
              {/* Member options loaded from backend when staff module is fully integrated */}
            </select>
          </div>

          {/* Área */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Área</label>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none"
            >
              <option value="ALL">Todas las Áreas</option>
              <option value="Seguridad">Seguridad</option>
              <option value="Portería">Portería</option>
              <option value="Administración">Administración</option>
              <option value="Aseo">Aseo</option>
              <option value="Mantenimiento">Mantenimiento</option>
            </select>
          </div>

          {/* Estado: PRESENTE, TARDANZA, AUSENTE, INCOMPLETO */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PRESENTE">PRESENTE</option>
              <option value="TARDANZA">TARDANZA</option>
              <option value="AUSENTE">AUSENTE</option>
              <option value="INCOMPLETO">INCOMPLETO</option>
            </select>
          </div>

          {/* Portería */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Portería / Puesto</label>
            <select
              value={gateFilter}
              onChange={(e) => setGateFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none"
            >
              <option value="ALL">Todos los Puestos</option>
              <option value="Portería principal">Portería Principal</option>
              <option value="Portería secundaria">Portería Secundaria</option>
              <option value="Predio general">Predio General</option>
            </select>
          </div>
        </div>
      </div>

      {/* AUDIT TABLE (REQUERIMIENTO 20) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--tenant-primary)]" />
            Registro de Marcaciones ({records.length})
          </h3>
          <span className="text-xs text-slate-400">Auditoría Operativa</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Cargando registros...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No hay registros de asistencia para los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Empleado</th>
                  <th className="py-3 px-3">Puesto / Portería</th>
                  <th className="py-3 px-3">Entrada Programada</th>
                  <th className="py-3 px-3">Entrada Real</th>
                  <th className="py-3 px-3">Salida Programada</th>
                  <th className="py-3 px-3">Salida Real</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-4">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {records.map((r) => {
                  const isPresent = r.status === 'PRESENTE';
                  const isLate = r.status === 'TARDANZA';
                  const isAbsent = r.status === 'AUSENTE';
                  const isIncomplete = r.status === 'INCOMPLETO';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Empleado */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{r.memberName}</div>
                        <div className="text-[10px] text-slate-400">
                          {r.position} · {r.area}
                        </div>
                      </td>

                      {/* Puesto */}
                      <td className="py-3.5 px-3">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {r.gate || 'Predio general'}
                        </span>
                      </td>

                      {/* Entrada Programada */}
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-600">
                        {r.scheduledCheckIn || '06:00'}
                      </td>

                      {/* Entrada Real */}
                      <td className="py-3.5 px-3">
                        {r.checkIn ? (
                          <span
                            className={`font-mono font-bold flex items-center gap-1 ${
                              isLate ? 'text-amber-600' : 'text-emerald-700'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {r.checkIn}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Salida Programada */}
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-600">
                        {r.scheduledCheckOut || '18:00'}
                      </td>

                      {/* Salida Real */}
                      <td className="py-3.5 px-3">
                        {r.checkOut ? (
                          <span className="font-mono font-bold text-slate-900">{r.checkOut}</span>
                        ) : r.checkIn ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                            En turno
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-3">
                        {isPresent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            PRESENTE
                          </span>
                        )}
                        {isLate && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            TARDANZA
                          </span>
                        )}
                        {isAbsent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            AUSENTE
                          </span>
                        )}
                        {isIncomplete && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-800 border border-purple-200">
                            <ShieldAlert className="w-3 h-3 text-purple-600" />
                            INCOMPLETO
                          </span>
                        )}
                      </td>

                      {/* Observaciones */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-500 max-w-xs truncate">
                        {r.observations || 'Sin novedad reportada'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
