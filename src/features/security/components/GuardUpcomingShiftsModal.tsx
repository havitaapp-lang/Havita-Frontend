import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  X,
  ShieldCheck,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  List,
  Calendar as CalendarIcon,
  Sparkles,
  Coffee,
  CheckCircle2,
} from 'lucide-react';
import type { Shift } from '../../personal/types/personal.types';

interface GuardUpcomingShiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  upcomingShifts: {
    today: Shift[];
    tomorrow: Shift[];
    thisWeek: Shift[];
    allShifts?: Shift[];
  };
  guardName: string;
}

const DAYS_OF_WEEK_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SHORT_DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const cleanShiftTitle = (name: string): string => {
  if (!name) return 'Turno';
  return name.replace(/\s*\(\d{2}:\d{2}.*?\)/g, '').replace(/\s*·.*$/, '').trim() || name;
};

export const GuardUpcomingShiftsModal: React.FC<GuardUpcomingShiftsModalProps> = ({
  isOpen,
  onClose,
  upcomingShifts,
  guardName,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarGranularity, setCalendarGranularity] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDayDate, setSelectedDayDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  // Consolidated list of all guard shifts
  const allShiftsList = useMemo(() => {
    if (upcomingShifts.allShifts && upcomingShifts.allShifts.length > 0) {
      return upcomingShifts.allShifts;
    }
    const map = new Map<string, Shift>();
    [...upcomingShifts.today, ...upcomingShifts.tomorrow, ...upcomingShifts.thisWeek].forEach((s) => {
      map.set(s.id, s);
    });
    return Array.from(map.values());
  }, [upcomingShifts]);

  if (!isOpen) return null;

  // Helper date utilities
  const formatDateKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const isTodayDate = (d: Date): boolean => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const getShiftsForDate = (targetDate: Date): Shift[] => {
    const targetStr = formatDateKey(targetDate);
    const dayIndex = targetDate.getDay() === 0 ? 6 : targetDate.getDay() - 1;
    const targetDayName = DAYS_OF_WEEK_NAMES[dayIndex];

    return allShiftsList.filter((s) => {
      if (s.date) {
        return s.date === targetStr;
      }
      if (s.daysOfWeek && s.daysOfWeek.includes(targetDayName)) {
        return true;
      }
      return false;
    });
  };

  // Week calculation (Monday to Sunday)
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const monday = getMonday(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const sunday = weekDays[6];

  // Month calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstDayIndex = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthGridDays: { date: Date; isCurrentMonth: boolean }[] = [];
  // Days from previous month
  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    monthGridDays.push({
      date: new Date(year, month - 1, prevMonthLastDate - i),
      isCurrentMonth: false,
    });
  }
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    monthGridDays.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }
  // Days from next month to complete rows of 7
  const remaining = 7 - (monthGridDays.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      monthGridDays.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
  }

  // Navigation handlers
  const handlePrev = () => {
    if (calendarGranularity === 'week') {
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 7);
      setCurrentDate(prev);
    } else {
      const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      setCurrentDate(prev);
    }
  };

  const handleNext = () => {
    if (calendarGranularity === 'week') {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    } else {
      const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      setCurrentDate(next);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDayDate(formatDateKey(now));
  };

  const formatPeriodLabel = () => {
    if (calendarGranularity === 'week') {
      const startDay = monday.getDate();
      const startMonth = MONTH_NAMES[monday.getMonth()];
      const endDay = sunday.getDate();
      const endMonth = MONTH_NAMES[sunday.getMonth()];
      const yr = sunday.getFullYear();

      if (monday.getMonth() === sunday.getMonth()) {
        return `Semana del ${startDay} al ${endDay} de ${startMonth}, ${yr}`;
      }
      return `Semana del ${startDay} de ${startMonth} al ${endDay} de ${endMonth}, ${yr}`;
    }
    return `${MONTH_NAMES[month]} ${year}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className={`w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] transition-all duration-300 ${
          viewMode === 'calendar' ? 'max-w-6xl' : 'max-w-xl'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[var(--tenant-primary)] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">Próximos turnos</h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {viewMode === 'calendar' ? 'Vista Calendario' : 'Vista Lista'}
                </span>
              </div>
              <p className="text-xs text-blue-100">
                Programación oficial para <strong className="text-white">{guardName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Pills */}
            <div className="bg-black/20 p-1 rounded-xl flex items-center gap-1 border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendario</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* ========================================================
              VIEW 1: LISTA (Vista tradicional por secciones)
              ======================================================== */}
          {viewMode === 'list' && (
            <div className="p-5 space-y-5">
              {/* Promo Banner to switch to Calendar View */}
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-50/90 to-indigo-50 border border-blue-200/80 rounded-2xl hover:border-blue-300 hover:shadow-xs transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Ver calendario de turnos
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Visualiza tus días de trabajo, descansos y horarios en cuadrícula semanal o mensual.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-white border border-blue-200 px-3 py-1.5 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                  Ver calendario →
                </span>
              </button>

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
          )}

          {/* ========================================================
              VIEW 2: CALENDARIO TIPO TEAMS (Semana & Mes)
              ======================================================== */}
          {viewMode === 'calendar' && (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Calendar Control Toolbar (Teams Style) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                {/* Left: Navigation and Period Title */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                      title="Anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleToday}
                      className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-x border-slate-100"
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                      title="Siguiente"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <h4 className="text-xs sm:text-sm font-black text-slate-800 ml-1">
                    {formatPeriodLabel()}
                  </h4>
                </div>

                {/* Right: Granularity Switcher (Semana / Mes) */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-start sm:self-auto shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setCalendarGranularity('week')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      calendarGranularity === 'week'
                        ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarGranularity('month')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      calendarGranularity === 'month'
                        ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Mes
                  </button>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────
                  SEMANA: Cuadrícula semanal estilo Teams Shifts
                  ────────────────────────────────────────────────────────── */}
              {calendarGranularity === 'week' && (
                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[1020px] grid grid-cols-7 gap-3">
                    {weekDays.map((d, index) => {
                      const dayShifts = getShiftsForDate(d);
                      const isToday = isTodayDate(d);
                      const dateKey = formatDateKey(d);
                      const isSelected = selectedDayDate === dateKey;

                      return (
                        <div
                          key={dateKey}
                          onClick={() => setSelectedDayDate(dateKey)}
                          className={`rounded-2xl border flex flex-col transition-all cursor-pointer min-h-[300px] ${
                            isToday
                              ? 'bg-blue-50/40 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                              : isSelected
                              ? 'bg-slate-50 border-slate-300 ring-1 ring-slate-400'
                              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
                          }`}
                        >
                          {/* Day Column Header */}
                          <div
                            className={`p-3 border-b text-center rounded-t-2xl transition-colors ${
                              isToday
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50/80 text-slate-700 border-slate-100'
                            }`}
                          >
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider block ${
                                isToday ? 'text-blue-100' : 'text-slate-400'
                              }`}
                            >
                              {SHORT_DAY_NAMES[index]}
                            </span>
                            <div className="flex items-center justify-center gap-1.5 mt-0.5">
                              <span className="text-base font-black">
                                {d.getDate()}
                              </span>
                              {isToday && (
                                <span className="text-[9px] font-black bg-white/20 px-1.5 py-0.2 rounded-full uppercase">
                                  Hoy
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Day Column Body (Shift Cards) */}
                          <div className="p-2.5 flex-1 space-y-2">
                            {dayShifts.length === 0 ? (
                              <div className="h-full min-h-[180px] flex flex-col items-center justify-center p-3 text-center text-slate-400 rounded-xl bg-slate-50/50 border border-dashed border-slate-200">
                                <Coffee className="w-4 h-4 mb-1 text-slate-300" />
                                <span className="text-[11px] font-semibold text-slate-400">
                                  Día Libre
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Compensatorio
                                </span>
                              </div>
                            ) : (
                              dayShifts.map((s) => (
                                <div
                                  key={s.id}
                                  className={`p-3 rounded-xl border text-left shadow-2xs transition-transform hover:-translate-y-0.5 overflow-hidden ${
                                    isToday
                                      ? 'bg-blue-50/30 border-l-4 border-l-blue-600 border-blue-200'
                                      : 'bg-white border-l-4 border-l-[var(--tenant-primary)] border-slate-200'
                                  }`}
                                >
                                  {/* Shift Name */}
                                  <div className="mb-1.5">
                                    <span
                                      className="font-bold text-slate-900 text-xs leading-snug block truncate"
                                      title={s.shiftName}
                                    >
                                      {cleanShiftTitle(s.shiftName)}
                                    </span>
                                  </div>

                                  {/* Schedule */}
                                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-800 mb-1.5 whitespace-nowrap bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100/80 w-fit">
                                    <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>
                                      {s.startTime} — {s.endTime}
                                    </span>
                                  </div>

                                  {/* Gate */}
                                  <div
                                    className="flex items-center gap-1 text-[11px] text-slate-500 mb-2 truncate"
                                    title={s.gate || 'Portería principal'}
                                  >
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{s.gate || 'Portería principal'}</span>
                                  </div>

                                  {/* Badges */}
                                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[10px]">
                                    <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                                      {s.shiftType || 'Normal'}
                                    </span>
                                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5 shrink-0">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                      Confirmado
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────
                  MES: Cuadrícula mensual completa estilo calendario
                  ────────────────────────────────────────────────────────── */}
              {calendarGranularity === 'month' && (
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    {/* Header: Días de la semana */}
                    <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center py-2.5 text-xs font-bold text-slate-600">
                      {SHORT_DAY_NAMES.map((name) => (
                        <div key={name}>{name}</div>
                      ))}
                    </div>

                    {/* Matrix de días del mes */}
                    <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
                      {monthGridDays.map(({ date: d, isCurrentMonth }, idx) => {
                        const dayShifts = getShiftsForDate(d);
                        const isToday = isTodayDate(d);
                        const dateKey = formatDateKey(d);
                        const isSelected = selectedDayDate === dateKey;

                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedDayDate(dateKey)}
                            className={`min-h-[85px] p-1.5 transition-colors cursor-pointer flex flex-col justify-between ${
                              !isCurrentMonth
                                ? 'bg-slate-50/40 text-slate-300'
                                : isSelected
                                ? 'bg-blue-50/40 ring-2 ring-blue-500/20'
                                : 'bg-white hover:bg-slate-50/80'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                  isToday
                                    ? 'bg-blue-600 text-white font-black'
                                    : isCurrentMonth
                                    ? 'text-slate-700'
                                    : 'text-slate-300'
                                }`}
                              >
                                {d.getDate()}
                              </span>
                              {dayShifts.length > 0 && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1" />
                              )}
                            </div>

                            <div className="mt-1 space-y-1">
                              {dayShifts.slice(0, 2).map((s) => (
                                <div
                                  key={s.id}
                                  className="text-[10px] font-semibold bg-blue-50 text-blue-800 border-l-2 border-blue-600 px-1 py-0.5 rounded truncate"
                                  title={`${s.shiftName} (${s.startTime} - ${s.endTime})`}
                                >
                                  {s.startTime} {s.shiftName}
                                </div>
                              ))}
                              {dayShifts.length > 2 && (
                                <span className="text-[9px] font-bold text-slate-400 block px-1">
                                  +{dayShifts.length - 2} más
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Panel de detalles del día seleccionado en vista Mes */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-blue-600" />
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Detalles del día seleccionado: <span className="text-blue-700">{selectedDayDate}</span>
                        </h5>
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        {allShiftsList.filter((s) => s.date === selectedDayDate).length} turno(s) programado(s)
                      </span>
                    </div>

                    {allShiftsList.filter((s) => s.date === selectedDayDate).length === 0 ? (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                        <Coffee className="w-4 h-4 text-slate-400" />
                        No hay turnos asignados para esta fecha (Día libre / Compensatorio).
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {allShiftsList
                          .filter((s) => s.date === selectedDayDate)
                          .map((s) => (
                            <ShiftCard key={s.id} shift={s} isToday={selectedDayDate === formatDateKey(new Date())} />
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Informative footer summary badge */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  Turnos asignados oficialmente por la administración de la copropiedad.
                </span>
                <span className="font-bold text-slate-700">
                  Total turnos registrados: {allShiftsList.length}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div>
            {viewMode === 'list' ? (
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className="py-2 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Ver calendario</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="py-2 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
              >
                <List className="w-3.5 h-3.5" />
                <span>Ver lista detallada</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="py-2 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-xs"
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

export default GuardUpcomingShiftsModal;
