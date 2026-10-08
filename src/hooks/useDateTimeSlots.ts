import { useMemo } from 'react';

import type { VisitorSettings } from '../types/visitorSettings';
import { JS_DAY_TO_DAY_OF_WEEK } from '../types/visitorSettings';

// ─── Configuration ────────────────────────────────────────────
export interface DateTimePickerConfig {
  /** Interval between time slots in minutes (default: 30) */
  slotIntervalMinutes: number;
  /** Minimum advance notice in minutes from now (default: 30) */
  minimumAdvanceMinutes: number;
  /** Earliest allowed time "HH:MM" 24h (default: "06:00") */
  openingTime: string;
  /** Latest allowed time "HH:MM" 24h (default: "22:00") */
  closingTime: string;
  /** Number of quick-pick days to show (default: 5) */
  quickPickDays: number;
  /** Max calendar future days (default: 60) */
  maxFutureDays: number;
}

export const DEFAULT_CONFIG: DateTimePickerConfig = {
  slotIntervalMinutes: 30,
  minimumAdvanceMinutes: 30,
  openingTime: '06:00',
  closingTime: '22:00',
  quickPickDays: 5,
  maxFutureDays: 60,
};

// ─── Types ────────────────────────────────────────────────────
export interface DayOption {
  /** ISO date string "2026-09-14" */
  dateISO: string;
  /** Friendly label: "Hoy", "Mañana", or "Mié" */
  label: string;
  /** Day number "14" */
  dayNumber: number;
  /** Short month "SEP" */
  monthShort: string;
  /** Full weekday for aria */
  weekdayFull: string;
  /** Whether today */
  isToday: boolean;
  /** Whether tomorrow */
  isTomorrow: boolean;
}

export interface TimeSlot {
  /** 24h format "09:00", "09:30" */
  value24h: string;
  /** Display format "9:00 AM", "9:30 AM" */
  display: string;
}

// ─── Pure Utility Functions ───────────────────────────────────

/** Parse "HH:MM" to total minutes from midnight */
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Convert total minutes to "HH:MM" */
function minutesToTime24(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Convert "HH:MM" 24h → "H:MM AM/PM" display */
export function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Get today's date as ISO string */
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Add N days to an ISO date string */
function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Check if an ISO date is before today */
export function isDateBeforeToday(isoDate: string): boolean {
  return isoDate < todayISO();
}

/** Check if an ISO date is today */
function isToday(isoDate: string): boolean {
  return isoDate === todayISO();
}

const WEEKDAYS_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WEEKDAYS_FULL_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_SHORT_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const MONTHS_FULL_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ─── Core Logic ───────────────────────────────────────────────

/** Generate the list of quick-pick day options */
export function getUpcomingDays(count: number): DayOption[] {
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const days: DayOption[] = [];

  for (let i = 0; i < count; i++) {
    const dateISO = addDays(today, i);
    const d = new Date(dateISO + 'T12:00:00');
    const dayOfWeek = d.getDay();
    const dayNum = d.getDate();
    const monthIdx = d.getMonth();

    let label: string;
    if (dateISO === today) {
      label = 'Hoy';
    } else if (dateISO === tomorrow) {
      label = 'Mañana';
    } else {
      label = WEEKDAYS_SHORT_ES[dayOfWeek];
    }

    days.push({
      dateISO,
      label,
      dayNumber: dayNum,
      monthShort: MONTHS_SHORT_ES[monthIdx],
      weekdayFull: WEEKDAYS_FULL_ES[dayOfWeek],
      isToday: dateISO === today,
      isTomorrow: dateISO === tomorrow,
    });
  }

  return days;
}

/** Generate all possible time slots for a given date, filtering past ones if today */
export function getAvailableSlots(
  dateISO: string,
  config: DateTimePickerConfig
): TimeSlot[] {
  const openMinutes = parseTimeToMinutes(config.openingTime);
  const closeMinutes = parseTimeToMinutes(config.closingTime);
  const interval = config.slotIntervalMinutes;

  // If today, calculate the earliest allowed slot
  let earliestMinutes = openMinutes;
  if (isToday(dateISO)) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const withAdvance = nowMinutes + config.minimumAdvanceMinutes;
    // Round up to the next slot boundary
    earliestMinutes = Math.ceil(withAdvance / interval) * interval;
  }

  const slots: TimeSlot[] = [];
  for (let m = Math.max(openMinutes, earliestMinutes); m <= closeMinutes; m += interval) {
    const time24 = minutesToTime24(m);
    slots.push({
      value24h: time24,
      display: formatTime12h(time24),
    });
  }

  return slots;
}

/** Generate available slots evaluating the tenant visitor settings overrides */
export function getAvailableSlotsForDay(
  dateISO: string,
  visitorSettings: VisitorSettings | null,
  baseConfig: DateTimePickerConfig = DEFAULT_CONFIG
): TimeSlot[] {
  const isCustom = visitorSettings && visitorSettings.mode === 'CUSTOM';
  let openingTime = baseConfig.openingTime;
  let closingTime = baseConfig.closingTime;

  if (!isCustom) {
    // 24 HOURS mode - allow all day
    openingTime = '00:00';
    closingTime = '23:30'; // Up to 11:30 PM for 30min intervals
  } else if (visitorSettings) {
    const d = new Date(dateISO + 'T12:00:00');
    const dayOfWeek = JS_DAY_TO_DAY_OF_WEEK[d.getDay()];
    const daySchedule = visitorSettings.daySchedules.find((ds) => ds.dayOfWeek === dayOfWeek);

    if (!daySchedule || !daySchedule.enabled) {
      return []; // Not allowed this day
    }
    
    openingTime = daySchedule.startTime || '00:00';
    closingTime = daySchedule.endTime || '23:30';
  }

  return getAvailableSlots(dateISO, { ...baseConfig, openingTime, closingTime });
}

/** Find the next available slot closest to a preferred time */
export function findClosestAvailableSlot(
  slots: TimeSlot[],
  preferredTime24: string
): TimeSlot | null {
  if (slots.length === 0) return null;

  const prefMinutes = parseTimeToMinutes(preferredTime24);

  // Try to find exact match
  const exact = slots.find(s => s.value24h === preferredTime24);
  if (exact) return exact;

  // Find closest future slot
  const future = slots.find(s => parseTimeToMinutes(s.value24h) >= prefMinutes);
  if (future) return future;

  // Fallback to first slot
  return slots[0];
}

/** Format a date + time into a human-readable string for display/storage */
export function formatExpectedAt(dateISO: string, time24: string): string {
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const d = new Date(dateISO + 'T12:00:00');
  const display12h = formatTime12h(time24);

  if (dateISO === today) {
    return `Hoy, ${display12h}`;
  }
  if (dateISO === tomorrow) {
    return `Mañana, ${display12h}`;
  }

  const dayOfWeek = WEEKDAYS_SHORT_ES[d.getDay()];
  const dayNum = d.getDate();
  const month = MONTHS_FULL_ES[d.getMonth()];
  return `${dayOfWeek} ${dayNum} ${month}, ${display12h}`;
}

/** Format date only for the summary line */
export function formatDateLong(dateISO: string): string {
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const d = new Date(dateISO + 'T12:00:00');

  if (dateISO === today) {
    return `Hoy, ${d.getDate()} de ${MONTHS_FULL_ES[d.getMonth()]}`;
  }
  if (dateISO === tomorrow) {
    return `Mañana, ${d.getDate()} de ${MONTHS_FULL_ES[d.getMonth()]}`;
  }

  return `${WEEKDAYS_FULL_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_FULL_ES[d.getMonth()]}`;
}

/** Get calendar grid data for a given month */
export function getCalendarMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();
  const monthName = MONTHS_FULL_ES[month];

  // Adjust so Monday = 0
  const startOffset = startWeekday === 0 ? 6 : startWeekday - 1;

  const cells: Array<{ day: number; dateISO: string; isCurrentMonth: boolean }> = [];

  // Previous month padding
  const prevMonth = new Date(year, month, 0);
  const prevDays = prevMonth.getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevDays - i;
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    cells.push({
      day: d,
      dateISO: `${py}-${String(pm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: false,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      dateISO: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: true,
    });
  }

  // Next month padding to fill grid
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nm = month === 11 ? 0 : month + 1;
    const ny = month === 11 ? year + 1 : year;
    cells.push({
      day: d,
      dateISO: `${ny}-${String(nm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: false,
    });
  }

  void firstDay;
  void lastDay;
  void daysInMonth;

  return { year, month, monthName, cells };
}

// ─── Custom Hook ──────────────────────────────────────────────

export function useDateTimeSlots(
  config: DateTimePickerConfig = DEFAULT_CONFIG,
  visitorSettings: VisitorSettings | null = null
) {
  const quickDays = useMemo(() => getUpcomingDays(config.quickPickDays), [config.quickPickDays]);

  const getSlotsForDate = (dateISO: string) => getAvailableSlotsForDay(dateISO, visitorSettings, config);

  const getSmartInitialDate = (): string => {
    const today = todayISO();
    const todaySlots = getAvailableSlotsForDay(today, visitorSettings, config);
    if (todaySlots.length > 0) return today;
    return addDays(today, 1);
  };

  const getSmartInitialTime = (dateISO: string, preferredTime24?: string): string => {
    const slots = getAvailableSlotsForDay(dateISO, visitorSettings, config);
    if (slots.length === 0) return '';

    if (preferredTime24) {
      const closest = findClosestAvailableSlot(slots, preferredTime24);
      return closest ? closest.value24h : slots[0].value24h;
    }

    return slots[0].value24h;
  };

  return {
    quickDays,
    getSlotsForDate,
    getSmartInitialDate,
    getSmartInitialTime,
    formatExpectedAt,
    formatDateLong,
    formatTime12h,
    getCalendarMonth,
    isDateBeforeToday,
    config,
  };
}
