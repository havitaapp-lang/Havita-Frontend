import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Calendar, Clock, ShieldCheck, UserCheck, Repeat, AlertCircle, Sparkles } from 'lucide-react';
import { shiftService, getTodayDateStr } from '../services/shiftService';
import type { ShiftType, PersonalMember, GateAssignment } from '../types/personal.types';
import { notificationService } from '../../../services/notificationService';
import { CharacterCounter } from '../../../components/ui/CharacterCounter';
import { FIELD_LIMITS } from '../../../validation/rules/limits';
import { useTenant } from '../../../contexts/TenantContext';

interface CreateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialGate?: string;
  initialTime?: string;
}

interface ShiftDuration {
  hours: number;
  minutes: number;
  isNextDay: boolean;
  totalMinutes: number;
}

const calculateShiftDuration = (start: string, end: string): ShiftDuration => {
  if (!start || !end) return { hours: 0, minutes: 0, isNextDay: false, totalMinutes: 0 };
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startTotal = (startH || 0) * 60 + (startM || 0);
  let endTotal = (endH || 0) * 60 + (endM || 0);

  let isNextDay = false;
  if (endTotal < startTotal) {
    endTotal += 24 * 60;
    isNextDay = true;
  }

  const diffMinutes = endTotal - startTotal;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return { hours, minutes, isNextDay, totalMinutes: diffMinutes };
};

const PRESET_RANGES = [
  { label: '06:00 — 18:00 (12h Día)', start: '06:00', end: '18:00' },
  { label: '18:00 — 06:00 (12h Noche)', start: '18:00', end: '06:00' },
  { label: '06:00 — 14:00 (8h Mañana)', start: '06:00', end: '14:00' },
  { label: '14:00 — 22:00 (8h Tarde)', start: '14:00', end: '22:00' },
  { label: '22:00 — 06:00 (8h Noche)', start: '22:00', end: '06:00' },
];

export const CreateShiftModal: React.FC<CreateShiftModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialGate,
  initialTime,
}) => {
  const { currentTenant } = useTenant();
  const todayStr = useMemo(() => getTodayDateStr(), []);
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState(initialTime || '06:00');
  const [endTime, setEndTime] = useState(initialTime === '18:00' ? '06:00' : '18:00');
  const [gate, setGate] = useState<GateAssignment>((initialGate as GateAssignment) || 'Portería principal');
  const [shiftType, setShiftType] = useState<ShiftType>('Normal');
  const [selectedGuardId, setSelectedGuardId] = useState('');
  const [notes, setNotes] = useState('');

  // Recurrence
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
  ]);
  const [durationWeeks, setDurationWeeks] = useState(2);

  // Compatible staff only (Security/Portería) - Rule 24
  const [eligibleGuards, setEligibleGuards] = useState<PersonalMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize on modal opening
  useEffect(() => {
    if (isOpen) {
      setDate(getTodayDateStr());
      if (initialTime) {
        setStartTime(initialTime);
        setEndTime(initialTime === '18:00' ? '06:00' : '18:00');
      }
      if (initialGate) {
        setGate(initialGate as GateAssignment);
      }
    }
  }, [isOpen, initialTime, initialGate]);

  useEffect(() => {
    shiftService.getEligibleGuards().then((guards) => {
      setEligibleGuards(guards);
      if (guards.length > 0 && !selectedGuardId) {
        setSelectedGuardId(guards[0].id);
      }
    });
  }, [selectedGuardId]);

  // Validations
  const isDateBeforeToday = Boolean(date && date < todayStr);
  const duration = useMemo(() => calculateShiftDuration(startTime, endTime), [startTime, endTime]);
  const isTimeSame = duration.totalMinutes === 0;
  const isDurationTooShort = duration.totalMinutes > 0 && duration.totalMinutes < 30;
  const isTimeInvalid = isTimeSame || isDurationTooShort;

  if (!isOpen) return null;

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const applyPreset = (presetStart: string, presetEnd: string) => {
    setStartTime(presetStart);
    setEndTime(presetEnd);
  };

  const getShiftPeriodName = (time: string) => {
    const [h] = time.split(':').map(Number);
    if (h >= 5 && h < 12) return 'Mañana';
    if (h >= 12 && h < 18) return 'Tarde';
    return 'Noche';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDateBeforeToday) {
      notificationService.showError(
        'Fecha no válida',
        `La fecha inicial no puede ser anterior al día de hoy (${todayStr}).`
      );
      return;
    }

    if (isTimeSame) {
      notificationService.showError(
        'Horario no válido',
        'La hora de finalización debe ser diferente a la hora de inicio.'
      );
      return;
    }

    if (isDurationTooShort) {
      notificationService.showError(
        'Duración insuficiente',
        'El turno debe tener una duración mínima de al menos 30 minutos.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const chosenGuard = eligibleGuards.find((g) => g.id === selectedGuardId);
      const guardName = chosenGuard
        ? `${chosenGuard.firstName} ${chosenGuard.lastName}`
        : 'Sin asignar';
      const guardPosition = chosenGuard ? chosenGuard.position : 'Guarda de seguridad';

      const dynamicShiftName = `Turno ${getShiftPeriodName(startTime)} (${startTime} — ${endTime}) · ${gate}`;

      if (isRecurrent && selectedDays.length > 0) {
        await shiftService.createRecurrentShifts(
          {
            tenantId: currentTenant?.id || '',
            memberId: selectedGuardId,
            memberName: guardName,
            memberPosition: guardPosition,
            area: 'Seguridad',
            shiftName: dynamicShiftName,
            startTime,
            endTime,
            gate,
            shiftType,
            daysOfWeek: selectedDays,
            status: 'PROGRAMADO',
            notes,
          },
          selectedDays,
          durationWeeks
        );

        notificationService.showToast(
          `✓ Se generaron los turnos recurrentes para ${durationWeeks} semanas exitosamente`,
          'success'
        );
      } else {
        await shiftService.createShift({
          tenantId: currentTenant?.id || '',
          date,
          memberId: selectedGuardId,
          memberName: guardName,
          memberPosition: guardPosition,
          area: 'Seguridad',
          shiftName: dynamicShiftName,
          startTime,
          endTime,
          gate,
          shiftType,
          status: 'PROGRAMADO',
          notes,
          daysOfWeek: ['Lunes'],
        });

        notificationService.showToast(`✓ Turno programado para ${guardName}`, 'success');
      }

      onSuccess();
      onClose();
    } catch {
      notificationService.showError('Error', 'No se pudo crear el turno');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 pb-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-[var(--tenant-primary)] flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">+ Nuevo turno de portería</h3>
              <p className="text-xs text-slate-400">
                Asignación de puesto, horarios y configuración recurrente
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
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Fecha */}
          <div>
            <label htmlFor="shift-date" className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Fecha inicial <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                A partir de hoy ({todayStr})
              </span>
            </label>
            <input
              id="shift-date"
              type="date"
              required
              min={todayStr}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl border outline-none transition-all ${
                isDateBeforeToday
                  ? 'border-rose-400 bg-rose-50/40 text-rose-800 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20'
              }`}
            />
            {isDateBeforeToday && (
              <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                La fecha inicial no puede ser anterior al día actual ({todayStr}).
              </p>
            )}
          </div>

          {/* Horario (Inicio y Fin) - Totalmente Configurable */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="shift-start" className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Hora Inicio
                </label>
                <input
                  id="shift-start"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`w-full px-3 py-2.5 text-xs rounded-xl border bg-white outline-none font-mono font-bold transition-all ${
                    isTimeInvalid
                      ? 'border-rose-300 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
              </div>

              <div>
                <label htmlFor="shift-end" className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Hora Fin
                </label>
                <input
                  id="shift-end"
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`w-full px-3 py-2.5 text-xs rounded-xl border bg-white outline-none font-mono font-bold transition-all ${
                    isTimeInvalid
                      ? 'border-rose-300 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
              </div>
            </div>

            {/* Atajos Rápidos de Rango */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mr-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Atajos:
              </span>
              {PRESET_RANGES.map((preset) => {
                const isActive = startTime === preset.start && endTime === preset.end;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset.start, preset.end)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-2xs font-bold'
                        : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Duración y Feedback del Horario */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600">Duración:</span>
                <span className="text-[11px] font-black font-mono text-blue-700">
                  {duration.hours}h {duration.minutes > 0 ? `${duration.minutes}m` : ''}
                </span>
                {duration.isNextDay && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    🌙 Cruza al día siguiente
                  </span>
                )}
              </div>
              {isTimeSame && (
                <span className="text-[11px] text-rose-500 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> Horas idénticas
                </span>
              )}
              {isDurationTooShort && (
                <span className="text-[11px] text-rose-500 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> Mínimo 30 min
                </span>
              )}
            </div>
          </div>

          {/* Portería & Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="shift-gate" className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Portería / Puesto
              </label>
              <select
                id="shift-gate"
                value={gate}
                onChange={(e) => setGate(e.target.value as GateAssignment)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
              >
                <option value="Portería principal">Portería principal</option>
                <option value="Portería secundaria">Portería secundaria</option>
                <option value="Todas las porterías">Todas las porterías</option>
              </select>
            </div>

            <div>
              <label htmlFor="shift-type" className="block text-xs font-bold text-slate-700 mb-1">Tipo de Turno</label>
              <select
                id="shift-type"
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value as ShiftType)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
              >
                <option value="Normal">Normal</option>
                <option value="Especial">Especial</option>
                <option value="Relevo">Relevo</option>
                <option value="Refuerzo">Refuerzo</option>
              </select>
            </div>
          </div>

          {/* Guarda Asignado (Solo Personal Compatible - Regla 24) */}
          <div>
            <label htmlFor="shift-guard" className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                Guarda Asignado
              </span>
              <span className="text-[10px] text-blue-600 font-normal">
                (Filtrado: solo personal de seguridad)
              </span>
            </label>
            <select
              id="shift-guard"
              value={selectedGuardId}
              onChange={(e) => setSelectedGuardId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-800"
            >
              <option value="">-- Sin asignar (Alerta de cobertura) --</option>
              {eligibleGuards.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.firstName} {g.lastName} ({g.position} · {g.company || 'Directo'})
                </option>
              ))}
            </select>
          </div>

          {/* Notas Opcionales */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="shift-notes" className="block text-xs font-bold text-slate-700">Notas</label>
              <CharacterCounter current={notes.length} max={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH} />
            </div>
            <input
              id="shift-notes"
              type="text"
              maxLength={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH}
              placeholder="Instrucciones especiales para el puesto..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* RECURRENCIA (Regla 6) */}
          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-950">Repetir turno (Recurrente)</span>
              </div>
              <input
                type="checkbox"
                id="isRecurrent"
                checked={isRecurrent}
                onChange={(e) => setIsRecurrent(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {isRecurrent && (
              <div className="space-y-3 pt-2 border-t border-blue-100">
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    Días de la semana:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(
                      (day) => {
                        const isSelected = selectedDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Repetir durante:
                  </label>
                  <select
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-800"
                  >
                    <option value={1}>1 semana</option>
                    <option value={2}>2 semanas</option>
                    <option value={3}>3 semanas</option>
                    <option value={4}>4 semanas (1 mes completo)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isDateBeforeToday || isTimeInvalid}
              className={`flex-1 py-2.5 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                isSubmitting || isDateBeforeToday || isTimeInvalid
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-[var(--tenant-primary)] hover:bg-blue-600 text-white cursor-pointer'
              }`}
            >
              {isSubmitting ? 'Guardando...' : 'Crear Turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
