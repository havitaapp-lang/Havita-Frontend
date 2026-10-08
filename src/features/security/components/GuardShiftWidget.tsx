import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  CalendarDays,
  ClipboardList,
  LogOut,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { shiftService } from '../../personal/services/shiftService';
import { attendanceService } from '../../personal/services/attendanceService';
import type { Shift, AttendanceRecord } from '../../personal/types/personal.types';
import { GuardClockInModal } from './GuardClockInModal';
import { GuardClockOutModal } from './GuardClockOutModal';
import { GuardAttendanceHistoryModal } from './GuardAttendanceHistoryModal';
import { GuardUpcomingShiftsModal } from './GuardUpcomingShiftsModal';
import { notificationService } from '../../../services/notificationService';

export const GuardShiftWidget: React.FC = () => {
  const { user } = useAuth();
  const guardId = user?.id || 'pers-001';
  const guardName = user?.name || 'Carlos Rodríguez';

  const [shift, setShift] = useState<Shift | null>(null);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<{
    today: Shift[];
    tomorrow: Shift[];
    thisWeek: Shift[];
  }>({ today: [], tomorrow: [], thisWeek: [] });

  // Modals
  const [isClockInOpen, setIsClockInOpen] = useState(false);
  const [isClockOutOpen, setIsClockOutOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(false);

  // Time simulation state (default: 05:57 AM for prompt demo)
  const [simulatedTime, setSimulatedTime] = useState<string>('05:57');
  const [demoMode, setDemoMode] = useState<'early' | 'ontime' | 'late' | 'noturn' | 'custom'>('early');
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(204); // Default 3h 24m for demo prompt
  const [hasNoShift, setHasNoShift] = useState(false);

  // Load shift and attendance data
  const loadGuardShift = useCallback(async () => {
    if (hasNoShift) {
      setShift(null);
      return;
    }
    const current = await shiftService.getMyCurrentShift(guardId);
    setShift(current);

    if (current) {
      const rec = await attendanceService.getRecordForShift(current.id, guardId);
      setRecord(rec || null);
    }

    const myHistory = await attendanceService.getMyAttendance(guardId);
    setHistoryRecords(myHistory);

    const up = await shiftService.getMyUpcomingShifts(guardId);
    setUpcomingShifts(up);
  }, [guardId, hasNoShift]);

  useEffect(() => {
    loadGuardShift();

    const handleShiftUpdate = () => loadGuardShift();
    window.addEventListener('havita_shifts_changed', handleShiftUpdate);
    window.addEventListener('havita_attendance_changed', handleShiftUpdate);

    return () => {
      window.removeEventListener('havita_shifts_changed', handleShiftUpdate);
      window.removeEventListener('havita_attendance_changed', handleShiftUpdate);
    };
  }, [loadGuardShift]);

  // Live timer for elapsed time when on duty
  useEffect(() => {
    if (record?.checkIn && !record.checkOut) {
      const timer = setInterval(() => {
        setElapsedMinutes((prev) => prev + 1);
      }, 60000);
      return () => clearInterval(timer);
    }
  }, [record?.checkIn, record?.checkOut]);

  // Helpers for formatting
  const formatGreeting = () => {
    const hours = new Date().getHours();
    const firstName = guardName.split(' ')[0] || 'Carlos';
    if (hours < 12) return `Buenos días, ${firstName}`;
    if (hours < 18) return `Buenas tardes, ${firstName}`;
    return `Buenas noches, ${firstName}`;
  };

  const formatElapsed = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  };

  // Check shift timing relative to scheduled start (06:00)
  const scheduledStart = shift?.startTime || '06:00';
  const isEarly = simulatedTime < scheduledStart;
  const isLate = simulatedTime > scheduledStart;
  const diffMinutes = Math.abs(
    parseInt(simulatedTime.split(':')[0], 10) * 60 +
      parseInt(simulatedTime.split(':')[1], 10) -
      (parseInt(scheduledStart.split(':')[0], 10) * 60 + parseInt(scheduledStart.split(':')[1], 10))
  );

  // Status determination
  const isClockedIn = Boolean(record?.checkIn && !record?.checkOut);
  const isCompleted = Boolean(record?.checkIn && record?.checkOut);

  // Actions
  const handleConfirmClockIn = async (actualTime: string = simulatedTime, wasLate?: boolean) => {
    if (!shift) return;
    await attendanceService.clockIn({
      shiftId: shift.id,
      memberId: guardId,
      actualTime,
      isLate: wasLate ?? isLate,
    });
    setIsClockInOpen(false);
    notificationService.showToast(
      `✓ Entrada registrada (${actualTime}). ¡Buen turno!`,
      'success'
    );
    loadGuardShift();
  };

  const handleConfirmClockOut = async (actualExitTime: string = '18:03') => {
    if (!shift) return;
    await attendanceService.clockOut({
      shiftId: shift.id,
      memberId: guardId,
      actualTime: actualExitTime,
    });
    setIsClockOutOpen(false);
    notificationService.showToast(
      `✓ Turno completado exitosamente (${actualExitTime}).`,
      'success'
    );
    loadGuardShift();
  };

  const handleResetDemo = () => {
    setHasNoShift(false);
    setDemoMode('early');
    setSimulatedTime('05:57');
    setElapsedMinutes(204);
    shiftService.resetDemoData();
    attendanceService.resetDemoData();
    notificationService.showToast('Datos de prueba reiniciados al estado inicial', 'info');
    loadGuardShift();
  };

  const applyDemoScenario = (scenario: 'early' | 'ontime' | 'late' | 'noturn') => {
    setDemoMode(scenario);
    if (scenario === 'early') {
      setHasNoShift(false);
      setSimulatedTime('05:52');
    } else if (scenario === 'ontime') {
      setHasNoShift(false);
      setSimulatedTime('06:00');
    } else if (scenario === 'late') {
      setHasNoShift(false);
      setSimulatedTime('06:18');
    } else if (scenario === 'noturn') {
      setHasNoShift(true);
      setShift(null);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden mb-6">
      {/* Top Bar inside Card: Greeting & Navigation buttons */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100/80">
              MI TURNO
            </span>
            <span className="text-xs text-slate-400 font-medium">Control Táctil de Acceso</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
            {formatGreeting()}
          </h2>
          <p className="text-xs text-slate-500">
            {shift ? 'Este es tu turno de hoy' : 'Consulta tu asignación operativa'}
          </p>
        </div>

        {/* Quick Modals Triggers (Mis marcaciones & Próximos turnos) */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setIsUpcomingOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
          >
            <CalendarDays className="w-4 h-4 text-[var(--tenant-primary)]" />
            <span>Próximos turnos</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
          >
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            <span>Mis marcaciones</span>
          </button>
        </div>
      </div>

      {/* Main Shift Operational Area */}
      <div className="p-5 sm:p-6">
        {/* CASE 1: NO SHIFT TODAY */}
        {!shift || hasNoShift ? (
          <div className="p-6 text-center space-y-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <CalendarDays className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                No tienes un turno asignado para hoy.
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Tu puesto no registra programación para la fecha. Puedes consultar tus próximos turnos o solicitar confirmación a la administración.
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setIsUpcomingOpen(true)}
                className="px-6 py-3 rounded-2xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
              >
                Ver próximos turnos
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* CASE 2: HAS SHIFT (PENDIENTE, EN TURNO, O COMPLETADO) */
          <div className="space-y-4">
            {/* Shift Overview Banner */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm sm:text-base font-black text-white bg-white/10 px-3 py-1 rounded-xl">
                    {shift.startTime} — {shift.endTime}
                  </span>
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    {shift.gate || 'Portería Principal'}
                  </span>
                </div>

                {/* Status Indicator Badge */}
                <div className="pt-1 flex items-center gap-2">
                  {!isClockedIn && !isCompleted && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 uppercase tracking-wide">
                      <Clock className="w-3.5 h-3.5" />
                      PENDIENTE DE ENTRADA
                    </span>
                  )}

                  {isClockedIn && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-400 text-slate-950 uppercase tracking-wide">
                      <span className="w-2 h-2 rounded-full bg-slate-900 animate-ping" />
                      EN TURNO
                    </span>
                  )}

                  {isCompleted && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-400 text-slate-950 uppercase tracking-wide">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      TURNO COMPLETADO
                    </span>
                  )}

                  {/* Timing cues */}
                  {!isClockedIn && !isCompleted && (
                    <span className="text-xs text-slate-300 font-medium hidden sm:inline">
                      {isEarly && `Comienza en ${diffMinutes} min`}
                      {isLate && `Comenzó hace ${diffMinutes} min (Entrada tardía)`}
                      {!isEarly && !isLate && 'Horario exacto de inicio'}
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic State Metrics */}
              <div className="flex items-center gap-4 text-xs">
                {isClockedIn && (
                  <>
                    <div className="p-3 bg-white/10 rounded-2xl text-left">
                      <span className="text-[10px] text-slate-300 block">Entrada registrada</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {record?.checkIn || '05:57 AM'}
                      </span>
                    </div>

                    <div className="p-3 bg-white/10 rounded-2xl text-left">
                      <span className="text-[10px] text-slate-300 block">Tiempo transcurrido</span>
                      <span className="font-mono font-bold text-white text-sm">
                        {formatElapsed(elapsedMinutes)}
                      </span>
                    </div>
                  </>
                )}

                {isCompleted && (
                  <>
                    <div className="p-3 bg-white/10 rounded-2xl text-left">
                      <span className="text-[10px] text-slate-300 block">Entrada</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {record?.checkIn || '05:57 AM'}
                      </span>
                    </div>

                    <div className="p-3 bg-white/10 rounded-2xl text-left">
                      <span className="text-[10px] text-slate-300 block">Salida</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        {record?.checkOut || '06:03 PM'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS (Optimized for tablets with >= 48px height) */}
            <div>
              {/* STATE 1: PENDIENTE DE ENTRADA */}
              {!isClockedIn && !isCompleted && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsClockInOpen(true)}
                    className="w-full py-4 px-6 bg-[var(--tenant-primary)] hover:bg-blue-600 active:scale-[0.99] text-white font-black text-sm sm:text-base rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[52px]"
                  >
                    <Clock className="w-5 h-5" />
                    MARCAR ENTRADA
                  </button>

                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>
                      Hora a registrar: <strong className="font-mono text-slate-800">{simulatedTime}</strong>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Toca el botón para abrir la confirmación instantánea
                    </span>
                  </div>
                </div>
              )}

              {/* STATE 2: EN TURNO */}
              {isClockedIn && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsClockOutOpen(true)}
                    className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-black text-sm sm:text-base rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[52px]"
                  >
                    <LogOut className="w-5 h-5 text-amber-400" />
                    MARCAR SALIDA
                  </button>

                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      En puesto desde las {record?.checkIn || '05:57 AM'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Salida programada: {shift.endTime}
                    </span>
                  </div>
                </div>
              )}

              {/* STATE 3: TURNO COMPLETADO */}
              {isCompleted && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-black text-sm text-emerald-950">
                        ✓ Turno completado y cerrado con éxito
                      </p>
                      <p className="text-emerald-700 text-xs mt-0.5">
                        Marcación bloqueada para evitar duplicados. Tu asistencia ya está reflejada en la administración.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-2xs self-start sm:self-auto cursor-pointer whitespace-nowrap"
                  >
                    Ver mi registro
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DISCREET DEMO TOOLBAR: Quick Scenario Tester for Evaluators */}
      <div className="px-5 py-3 bg-slate-100/70 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-bold text-slate-700 text-[11px]">Simulador Demo:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyDemoScenario('early')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              demoMode === 'early' && !hasNoShift
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Anticipada (05:52 AM)
          </button>

          <button
            type="button"
            onClick={() => applyDemoScenario('ontime')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              demoMode === 'ontime' && !hasNoShift
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Puntual (06:00 AM)
          </button>

          <button
            type="button"
            onClick={() => applyDemoScenario('late')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              demoMode === 'late' && !hasNoShift
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Tardía (06:18 AM)
          </button>

          <button
            type="button"
            onClick={() => applyDemoScenario('noturn')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              hasNoShift
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Sin Turno Hoy
          </button>

          <button
            type="button"
            onClick={handleResetDemo}
            title="Restablecer datos originales"
            className="p-1 rounded-lg bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-900 border border-slate-200 cursor-pointer ml-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MODALS */}
      {shift && (
        <>
          <GuardClockInModal
            isOpen={isClockInOpen}
            onClose={() => setIsClockInOpen(false)}
            onConfirm={handleConfirmClockIn}
            shift={shift}
            currentTimeStr={simulatedTime}
            isEarly={isEarly}
            isLate={isLate}
            diffMinutes={diffMinutes}
          />

          <GuardClockOutModal
            isOpen={isClockOutOpen}
            onClose={() => setIsClockOutOpen(false)}
            onConfirm={handleConfirmClockOut}
            shift={shift}
            currentTimeStr="18:03"
            actualCheckIn={record?.checkIn}
            elapsedTimeString={formatElapsed(elapsedMinutes)}
          />
        </>
      )}

      <GuardAttendanceHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        records={historyRecords}
        guardName={guardName}
      />

      <GuardUpcomingShiftsModal
        isOpen={isUpcomingOpen}
        onClose={() => setIsUpcomingOpen(false)}
        upcomingShifts={upcomingShifts}
        guardName={guardName}
      />
    </div>
  );
};
