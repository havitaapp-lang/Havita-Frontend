import React, { useState, useEffect } from 'react';
import { Plus, X, Calendar, Clock, ShieldCheck, UserCheck, Repeat } from 'lucide-react';
import { shiftService } from '../services/shiftService';
import type { ShiftType, PersonalMember, GateAssignment } from '../types/personal.types';
import { notificationService } from '../../../services/notificationService';
import { CharacterCounter } from '../../../components/ui/CharacterCounter';
import { FIELD_LIMITS } from '../../../validation/rules/limits';

interface CreateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialGate?: string;
  initialTime?: string;
}

export const CreateShiftModal: React.FC<CreateShiftModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialGate,
  initialTime,
}) => {
  const [date, setDate] = useState('2026-09-14');
  const [startTime, setStartTime] = useState(initialTime || '06:00');
  const [endTime, setEndTime] = useState('18:00');
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

  useEffect(() => {
    shiftService.getEligibleGuards().then((guards) => {
      setEligibleGuards(guards);
      if (guards.length > 0 && !selectedGuardId) {
        setSelectedGuardId(guards[0].id);
      }
    });
  }, [selectedGuardId]);

  if (!isOpen) return null;

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const chosenGuard = eligibleGuards.find((g) => g.id === selectedGuardId);
      const guardName = chosenGuard
        ? `${chosenGuard.firstName} ${chosenGuard.lastName}`
        : 'Sin asignar';
      const guardPosition = chosenGuard ? chosenGuard.position : 'Guarda de seguridad';

      if (isRecurrent && selectedDays.length > 0) {
        await shiftService.createRecurrentShifts(
          {
            tenantId: 'tenant-limonar',
            memberId: selectedGuardId,
            memberName: guardName,
            memberPosition: guardPosition,
            area: 'Seguridad',
            shiftName: `Turno ${startTime === '06:00' ? 'Día' : 'Noche'} — ${gate}`,
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
          tenantId: 'tenant-limonar',
          date,
          memberId: selectedGuardId,
          memberName: guardName,
          memberPosition: guardPosition,
          area: 'Seguridad',
          shiftName: `Turno ${startTime === '06:00' ? 'Día' : 'Noche'} — ${gate}`,
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
            <label htmlFor="shift-date" className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Fecha inicial <span className="text-rose-500">*</span>
            </label>
            <input
              id="shift-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Horario (Inicio y Fin) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="shift-start" className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Hora Inicio
              </label>
              <select
                id="shift-start"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 font-mono font-bold"
              >
                <option value="06:00">06:00 AM</option>
                <option value="07:00">07:00 AM</option>
                <option value="14:00">02:00 PM (14:00)</option>
                <option value="18:00">06:00 PM (18:00)</option>
                <option value="22:00">10:00 PM (22:00)</option>
              </select>
            </div>

            <div>
              <label htmlFor="shift-end" className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Hora Fin
              </label>
              <select
                id="shift-end"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 font-mono font-bold"
              >
                <option value="14:00">02:00 PM (14:00)</option>
                <option value="18:00">06:00 PM (18:00)</option>
                <option value="22:00">10:00 PM (22:00)</option>
                <option value="06:00">06:00 AM (Día sig.)</option>
              </select>
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
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Guardando...' : 'Crear Turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
