import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  ShieldCheck,
  UserCheck,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { shiftService } from '../services/shiftService';
import type { Shift, ShiftStatus, GateCoverageSlot } from '../types/personal.types';
import { CreateShiftModal } from '../components/CreateShiftModal';
import { ChangeGuardModal } from '../components/ChangeGuardModal';
import { notificationService } from '../../../services/notificationService';

export const AdminShiftsPage: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [coverageSlots, setCoverageSlots] = useState<GateCoverageSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('2026-09-14');
  const [gateFilter, setGateFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<ShiftStatus | 'ALL'>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [preselectedGate, setPreselectedGate] = useState<string | undefined>(undefined);
  const [preselectedTime, setPreselectedTime] = useState<string | undefined>(undefined);
  const [changeGuardShift, setChangeGuardShift] = useState<Shift | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const allShifts = await shiftService.getAllShifts({
        date: dateFilter || undefined,
        gate: gateFilter,
        status: statusFilter,
        search,
      });
      setShifts(allShifts);

      const slots = await shiftService.getCoverageSlots(dateFilter || '2026-09-14');
      setCoverageSlots(slots);
    } catch {
      notificationService.showError('Error', 'No se pudieron cargar los turnos');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, gateFilter, statusFilter, search]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('havita_shifts_changed', handleUpdate);
    window.addEventListener('havita_attendance_changed', handleUpdate);

    return () => {
      window.removeEventListener('havita_shifts_changed', handleUpdate);
      window.removeEventListener('havita_attendance_changed', handleUpdate);
    };
  }, [loadData]);

  const handleOpenAssignModal = (slot: GateCoverageSlot) => {
    setPreselectedGate(slot.gate);
    setPreselectedTime(slot.rawStartTime);
    setIsCreateModalOpen(true);
  };

  const handleDuplicateShift = async (shift: Shift) => {
    const nextDay = '2026-09-15';
    await shiftService.duplicateShift(shift.id, nextDay);
    notificationService.showToast(`✓ Turno duplicado con éxito para el ${nextDay}`, 'success');
    loadData();
  };

  const handleCancelShift = async (shiftId: string) => {
    if (confirm('¿Estás seguro de cancelar este turno?')) {
      await shiftService.cancelShift(shiftId);
      notificationService.showToast('Turno cancelado', 'info');
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Personal & Seguridad
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2 mt-0.5">
            <Calendar className="w-7 h-7 text-[var(--tenant-primary)]" />
            Control y Programación de Turnos
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Malla de relevos operativos, monitoreo de cobertura de porterías y programación recurrente.
          </p>
        </div>

        <button
          onClick={() => {
            setPreselectedGate(undefined);
            setPreselectedTime(undefined);
            setIsCreateModalOpen(true);
          }}
          className="px-5 py-2.5 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-bold rounded-2xl shadow-sm hover:shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer text-xs self-start sm:self-auto min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Nuevo turno
        </button>
      </div>

      {/* SECTION 7: COBERTURA DE PORTERÍA (REQUERIMIENTO CLAVE) */}
      <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Cobertura de Portería (Hoy)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisión en tiempo real de relevos y puestos sin vigilancia.
            </p>
          </div>

          {/* Indicators Legend */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />✓ Cubierto
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500" />⚠ Pendiente
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500" />🔴 Sin cobertura
            </span>
          </div>
        </div>

        {/* Coverage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {coverageSlots.map((slot, idx) => {
            const isCovered = slot.status === 'CUBIERTO';
            const isPending = slot.status === 'PENDIENTE';
            const isUncovered = slot.status === 'SIN_COBERTURA';

            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isUncovered
                    ? 'bg-rose-50/50 border-rose-300 shadow-xs ring-1 ring-rose-200'
                    : isCovered
                    ? 'bg-emerald-50/40 border-emerald-200 shadow-2xs'
                    : 'bg-amber-50/40 border-amber-200 shadow-2xs'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">{slot.gate}</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isUncovered
                          ? 'bg-rose-100 text-rose-800'
                          : isCovered
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isUncovered && '🔴 Sin cobertura'}
                      {isCovered && '✓ Cubierto'}
                      {isPending && '⚠ Pendiente'}
                    </span>
                  </div>

                  <div className="font-mono text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {slot.timeRange}
                  </div>

                  <div className="pt-1">
                    {slot.guardName && slot.guardName !== 'Sin asignar' ? (
                      <div className="text-xs">
                        <span className="text-[10px] text-slate-400 block font-semibold">Responsable:</span>
                        <span className="font-bold text-slate-900">{slot.guardName}</span>
                        {slot.actualCheckIn && (
                          <span className="block text-[11px] text-emerald-700 font-semibold mt-0.5">
                            ✓ Entrada marcada ({slot.actualCheckIn})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-rose-700 font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Puesto desocupado
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/60 mt-3 flex items-center justify-between">
                  {isUncovered ? (
                    <button
                      onClick={() => handleOpenAssignModal(slot)}
                      className="w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Asignar guarda
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const targetShift = shifts.find((s) => s.id === slot.shiftId);
                        if (targetShift) setChangeGuardShift(targetShift);
                      }}
                      className="text-xs text-[var(--tenant-primary)] font-bold hover:underline cursor-pointer"
                    >
                      Cambiar guarda →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 25: CAMBIO DE TURNO / RELEVO EN PORTERÍA PRINCIPAL */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 font-bold">
            ⚡
          </div>
          <div>
            <span className="font-bold text-slate-200 block">Esquema de Relevo Operativo (Portería Principal):</span>
            <div className="flex items-center gap-2 mt-0.5 text-slate-300 font-mono text-[11px]">
              <span className="text-white font-bold">Carlos Rodríguez (06:00 AM — 06:00 PM)</span>
              <span>↓ relevo con</span>
              <span className="text-amber-400 font-bold">Andrés Martínez (06:00 PM — 06:00 AM)</span>
            </div>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 font-mono text-[11px] self-start md:self-auto">
          24h Cobertura Continua
        </span>
      </div>

      {/* FILTERS BAR */}
      <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por guarda, portería o turno..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none"
            />
          </div>

          <select
            value={gateFilter}
            onChange={(e) => setGateFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none"
          >
            <option value="ALL">Todas las Porterías</option>
            <option value="Portería principal">Portería Principal</option>
            <option value="Portería secundaria">Portería Secundaria</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ShiftStatus | 'ALL')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="PROGRAMADO">PROGRAMADO</option>
            <option value="EN_CURSO">EN CURSO</option>
            <option value="COMPLETADO">COMPLETADO</option>
            <option value="AUSENTE">AUSENTE</option>
            <option value="CANCELADO">CANCELADO</option>
          </select>
        </div>
      </div>

      {/* SHIFTS LIST / TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--tenant-primary)]" />
            Listado de Turnos Asignados ({shifts.length})
          </h3>
          <span className="text-xs text-slate-400">Fecha activa: {dateFilter || 'Hoy'}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Cargando turnos...</div>
        ) : shifts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No se encontraron turnos con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Horario</th>
                  <th className="py-3 px-3">Puesto / Portería</th>
                  <th className="py-3 px-3">Guarda Responsable</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3">Marcación Real</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {shifts.map((s) => {
                  const isEnCurso = s.status === 'EN_CURSO';
                  const isCompletado = s.status === 'COMPLETADO';
                  const isCancelado = s.status === 'CANCELADO';
                  const isAusente = s.status === 'AUSENTE';
                  const isProgramado = s.status === 'PROGRAMADO';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {s.startTime} — {s.endTime}
                        </div>
                        {s.date && <span className="text-[10px] text-slate-400">{s.date}</span>}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          {s.gate || 'Predio general'}
                        </span>
                        <span className="text-[10px] text-slate-400">{s.shiftName}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        {s.memberId && s.memberName !== 'Sin asignar' ? (
                          <div>
                            <span className="font-bold text-slate-900 block">{s.memberName}</span>
                            <span className="text-[10px] text-slate-400">{s.memberPosition}</span>
                          </div>
                        ) : (
                          <span className="text-rose-700 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            🔴 Sin asignar
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {s.shiftType || 'Normal'}
                        </span>
                        {s.isRecurrent && (
                          <span className="ml-1 text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                            Recurrente
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        {isProgramado && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            PROGRAMADO
                          </span>
                        )}
                        {isEnCurso && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                            EN CURSO
                          </span>
                        )}
                        {isCompletado && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                            COMPLETADO
                          </span>
                        )}
                        {isAusente && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            AUSENTE
                          </span>
                        )}
                        {isCancelado && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                            CANCELADO
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        {s.actualCheckIn ? (
                          <div className="text-[11px]">
                            <span className="text-emerald-700 font-bold block">
                              Entrada: {s.actualCheckIn} ✓
                            </span>
                            <span className="text-slate-500 font-mono text-[10px]">
                              Salida: {s.actualCheckOut || 'Pendiente'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            Sin marcación
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setChangeGuardShift(s)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Cambiar guarda"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDuplicateShift(s)}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Duplicar turno"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {!isCancelado && (
                            <button
                              onClick={() => handleCancelShift(s.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Cancelar turno"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS */}
      <CreateShiftModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadData}
        initialGate={preselectedGate}
        initialTime={preselectedTime}
      />

      <ChangeGuardModal
        isOpen={Boolean(changeGuardShift)}
        onClose={() => setChangeGuardShift(null)}
        onSuccess={loadData}
        shift={changeGuardShift}
      />
    </div>
  );
};
