import React, { useState, useMemo, useCallback } from 'react';
import type { VisitorSettings } from '../../types/visitorSettings';
import { Calendar, ChevronLeft, ChevronRight, Clock, Check, ChevronDown } from 'lucide-react';
import {
  useDateTimeSlots,
  formatDateLong,
  formatTime12h,
  type DateTimePickerConfig,
  DEFAULT_CONFIG,
} from '../../hooks/useDateTimeSlots';

// ─── Props ────────────────────────────────────────────────────

interface DateTimeAvailabilityPickerProps {
  selectedDate: string;
  selectedTime: string;
  onDateChange: (dateISO: string) => void;
  onTimeChange: (time24: string) => void;
  config?: Partial<DateTimePickerConfig>;
  disabled?: boolean;
  visitorSettings?: VisitorSettings | null;
  /** Optional message shown when auto-switching from today */
  onAutoSwitch?: (message: string) => void;
}

// ─── Component ────────────────────────────────────────────────

export const DateTimeAvailabilityPicker: React.FC<DateTimeAvailabilityPickerProps> = ({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  config: configOverride,
  disabled = false,
  visitorSettings = null,
  onAutoSwitch,
}) => {
  const mergedConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...configOverride }),
    [configOverride]
  );

  const {
    quickDays,
    getSlotsForDate,
    getSmartInitialTime,
    getCalendarMonth,
    isDateBeforeToday: isBeforeToday,
  } = useDateTimeSlots(mergedConfig, visitorSettings);

  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());

  // Compute available slots for the selected date
  const availableSlots = useMemo(
    () => getSlotsForDate(selectedDate),
    [selectedDate, getSlotsForDate]
  );

  // Calendar data
  const calendarData = useMemo(
    () => getCalendarMonth(calendarYear, calendarMonth),
    [calendarYear, calendarMonth, getCalendarMonth]
  );

  const [expandedSection, setExpandedSection] = useState<'morning' | 'afternoon' | 'evening' | null>(null);

  React.useEffect(() => {
    if (selectedTime) {
      const h = parseInt(selectedTime.split(':')[0], 10);
      if (h < 12) setExpandedSection('morning');
      else if (h < 18) setExpandedSection('afternoon');
      else setExpandedSection('evening');
    }
  }, [selectedTime]);

  // ─── Handlers ─────────────────────────────────────────────

  const handleDateSelect = useCallback(
    (dateISO: string) => {
      if (isBeforeToday(dateISO) || disabled) return;

      onDateChange(dateISO);
      setShowCalendar(false);

      // Check if slots exist for this date
      const slots = getSlotsForDate(dateISO);
      if (slots.length === 0) {
        // This shouldn't happen for future dates, but handle defensively
        onAutoSwitch?.('No hay horarios disponibles para esta fecha.');
        return;
      }

      // Try to preserve the current time selection
      if (selectedTime) {
        const stillValid = slots.some(s => s.value24h === selectedTime);
        if (!stillValid) {
          const newTime = getSmartInitialTime(dateISO, selectedTime);
          onTimeChange(newTime);
        }
      } else {
        // No time selected yet, auto-pick first
        onTimeChange(slots[0].value24h);
      }
    },
    [disabled, onDateChange, onTimeChange, selectedTime, getSlotsForDate, getSmartInitialTime, isBeforeToday, onAutoSwitch]
  );

  const handleTimeSelect = useCallback(
    (time24: string) => {
      if (disabled) return;
      onTimeChange(time24);
    },
    [disabled, onTimeChange]
  );

  const handleCalendarPrev = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(y => y - 1);
    } else {
      setCalendarMonth(m => m - 1);
    }
  };

  const handleCalendarNext = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(y => y + 1);
    } else {
      setCalendarMonth(m => m + 1);
    }
  };

  // ─── Render ───────────────────────────────────────────────

  const todayISO = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Group time slots by period for visual separation
  const morningSlots = availableSlots.filter(s => {
    const h = parseInt(s.value24h.split(':')[0]);
    return h < 12;
  });
  const afternoonSlots = availableSlots.filter(s => {
    const h = parseInt(s.value24h.split(':')[0]);
    return h >= 12 && h < 18;
  });
  const eveningSlots = availableSlots.filter(s => {
    const h = parseInt(s.value24h.split(':')[0]);
    return h >= 18;
  });

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* ─── Day Selection ──────────────────────────────────── */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          ¿Cuándo llegará tu visita?
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {quickDays.map((day) => {
            const isSelected = selectedDate === day.dateISO;
            const hasSlots = getSlotsForDate(day.dateISO).length > 0;

            return (
              <button
                key={day.dateISO}
                type="button"
                onClick={() => hasSlots ? handleDateSelect(day.dateISO) : undefined}
                disabled={!hasSlots}
                aria-label={`${day.weekdayFull} ${day.dayNumber} de ${day.monthShort}`}
                aria-pressed={isSelected}
                className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl border-2 transition-all cursor-pointer shrink-0 min-w-[64px] ${
                  isSelected
                    ? 'bg-[var(--tenant-primary)] border-[var(--tenant-primary)] text-white shadow-sm shadow-blue-200'
                    : hasSlots
                      ? 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'
                      : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                <span className={`text-[10px] font-bold leading-tight ${
                  isSelected ? 'text-blue-100' : hasSlots ? 'text-slate-500' : 'text-slate-300'
                }`}>
                  {day.label}
                </span>
                <span className={`text-base font-black leading-tight ${
                  isSelected ? 'text-white' : ''
                }`}>
                  {day.dayNumber}
                </span>
                <span className={`text-[9px] font-bold uppercase leading-tight ${
                  isSelected ? 'text-blue-200' : hasSlots ? 'text-slate-400' : 'text-slate-300'
                }`}>
                  {day.monthShort}
                </span>
              </button>
            );
          })}

          {/* Calendar trigger chip */}
          <button
            type="button"
            onClick={() => setShowCalendar(prev => !prev)}
            aria-label="Abrir calendario completo"
            className={`flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl border-2 transition-all cursor-pointer shrink-0 min-w-[64px] ${
              showCalendar
                ? 'bg-slate-800 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 mb-0.5" />
            <span className="text-[9px] font-bold">Calendario</span>
          </button>
        </div>
      </div>

      {/* ─── Mini Calendar (Expandable) ─────────────────────── */}
      {showCalendar && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handleCalendarPrev}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-slate-900 capitalize">
              {calendarData.monthName} {calendarData.year}
            </span>
            <button
              type="button"
              onClick={handleCalendarNext}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarData.cells.map((cell, idx) => {
              const isPast = isBeforeToday(cell.dateISO);
              const isSelectedDay = selectedDate === cell.dateISO;
              const isTodayCell = cell.dateISO === todayISO;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isPast || !cell.isCurrentMonth}
                  onClick={() => handleDateSelect(cell.dateISO)}
                  className={`aspect-square flex items-center justify-center text-xs rounded-xl transition-all ${
                    isSelectedDay
                      ? 'bg-[var(--tenant-primary)] text-white font-bold shadow-md shadow-blue-200'
                      : !cell.isCurrentMonth
                        ? 'text-slate-200 cursor-default'
                        : isPast
                          ? 'text-slate-300 cursor-not-allowed'
                          : isTodayCell
                            ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 border-dashed cursor-pointer hover:bg-blue-100'
                            : 'text-slate-700 cursor-pointer hover:bg-slate-100 font-medium'
                  }`}
                  aria-label={`${cell.day} ${calendarData.monthName}`}
                  aria-disabled={isPast || !cell.isCurrentMonth}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Time Slot Selection ─────────────────────────────── */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          Hora aproximada de llegada
        </label>

        {availableSlots.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-800 font-medium">
            No quedan horarios disponibles para esta fecha. Selecciona otro día.
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Morning */}
            {morningSlots.length > 0 && (
              <div className="bg-slate-50/50 rounded-xl border border-slate-200/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'morning' ? null : 'morning')}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Mañana ({morningSlots.length})
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSection === 'morning' ? 'rotate-180' : ''}`} />
                </button>
                {expandedSection === 'morning' && (
                  <div className="p-3 border-t border-slate-200/60 bg-white grid grid-cols-3 sm:grid-cols-4 gap-1.5 animate-in fade-in slide-in-from-top-1">
                    {morningSlots.map(slot => (
                      <TimeChip
                        key={slot.value24h}
                        slot={slot}
                        isSelected={selectedTime === slot.value24h}
                        onClick={() => handleTimeSelect(slot.value24h)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Afternoon */}
            {afternoonSlots.length > 0 && (
              <div className="bg-slate-50/50 rounded-xl border border-slate-200/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'afternoon' ? null : 'afternoon')}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Tarde ({afternoonSlots.length})
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSection === 'afternoon' ? 'rotate-180' : ''}`} />
                </button>
                {expandedSection === 'afternoon' && (
                  <div className="p-3 border-t border-slate-200/60 bg-white grid grid-cols-3 sm:grid-cols-4 gap-1.5 animate-in fade-in slide-in-from-top-1">
                    {afternoonSlots.map(slot => (
                      <TimeChip
                        key={slot.value24h}
                        slot={slot}
                        isSelected={selectedTime === slot.value24h}
                        onClick={() => handleTimeSelect(slot.value24h)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Evening */}
            {eveningSlots.length > 0 && (
              <div className="bg-slate-50/50 rounded-xl border border-slate-200/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'evening' ? null : 'evening')}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Noche ({eveningSlots.length})
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSection === 'evening' ? 'rotate-180' : ''}`} />
                </button>
                {expandedSection === 'evening' && (
                  <div className="p-3 border-t border-slate-200/60 bg-white grid grid-cols-3 sm:grid-cols-4 gap-1.5 animate-in fade-in slide-in-from-top-1">
                    {eveningSlots.map(slot => (
                      <TimeChip
                        key={slot.value24h}
                        slot={slot}
                        isSelected={selectedTime === slot.value24h}
                        onClick={() => handleTimeSelect(slot.value24h)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Summary Line ────────────────────────────────────── */}
      {selectedDate && selectedTime && (
        <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-200/60 rounded-xl px-3 py-2 text-xs">
          <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="text-blue-900 font-semibold text-[11px] sm:text-xs">
            📅 {formatDateLong(selectedDate)} · ≈ {formatTime12h(selectedTime)}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Sub-component: TimeChip ──────────────────────────────────

interface TimeChipProps {
  slot: { value24h: string; display: string };
  isSelected: boolean;
  onClick: () => void;
}

const TimeChip: React.FC<TimeChipProps> = ({ slot, isSelected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={isSelected}
    aria-label={`Seleccionar ${slot.display}`}
    className={`px-2 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
      isSelected
        ? 'bg-[var(--tenant-primary)] border-[var(--tenant-primary)] text-white shadow-sm shadow-blue-200 ring-1 ring-blue-300'
        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700'
    }`}
  >
    <span className="flex items-center justify-center gap-1">
      {isSelected && <Check className="w-3 h-3" />}
      {slot.display}
    </span>
  </button>
);
