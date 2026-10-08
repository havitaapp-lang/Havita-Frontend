/**
 * Tipos TypeScript para la configuración de horarios de visitas por tenant.
 * Espejo exacto de los DTOs del backend:
 *   - VisitorScheduleMode
 *   - VisitorDayScheduleResponse
 *   - VisitorSettingsResponse
 */

export type VisitorScheduleMode = 'HOURS_24' | 'CUSTOM';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface VisitorDaySchedule {
  dayOfWeek: DayOfWeek;
  /** Si el día tiene visitas permitidas */
  enabled: boolean;
  /** Hora de inicio en formato "HH:mm" (24h), null si el día está deshabilitado */
  startTime: string | null;
  /** Hora de fin en formato "HH:mm" (24h), null si el día está deshabilitado */
  endTime: string | null;
}

export interface VisitorSettings {
  mode: VisitorScheduleMode;
  /** Lista de configuraciones por día. Vacía si mode === 'HOURS_24'. */
  daySchedules: VisitorDaySchedule[];
}

/** Payload para actualizar la configuración (PUT /api/v1/access/visitor-settings) */
export interface UpdateVisitorSettingsPayload {
  mode: VisitorScheduleMode;
  daySchedules: VisitorDaySchedule[];
}

/** Mapa de nombre de día (JS Date.getDay()) a DayOfWeek del backend */
export const JS_DAY_TO_DAY_OF_WEEK: DayOfWeek[] = [
  'SUNDAY',    // 0
  'MONDAY',    // 1
  'TUESDAY',   // 2
  'WEDNESDAY', // 3
  'THURSDAY',  // 4
  'FRIDAY',    // 5
  'SATURDAY',  // 6
];

/** Etiquetas en español para cada día */
export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY:    'Lunes',
  TUESDAY:   'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY:  'Jueves',
  FRIDAY:    'Viernes',
  SATURDAY:  'Sábado',
  SUNDAY:    'Domingo',
};

/** Orden canónico de los días de la semana (para renderizar el formulario) */
export const ORDERED_DAYS: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];
