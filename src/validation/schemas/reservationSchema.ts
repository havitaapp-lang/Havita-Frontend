import { z } from 'zod';
import { FIELD_LIMITS } from '../rules/limits';
import { VALIDATION_MESSAGES } from '../messages/es';

export const reservationSchema = z.object({
  zone: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.REQUIRED('La zona común')),
  date: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.REQUIRED('La fecha de reserva')),
  startTime: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.REQUIRED('La hora de inicio')),
  endTime: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.REQUIRED('La hora de finalización')),
  propertyId: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.REQUIRED('La propiedad o unidad')),
  attendees: z
    .coerce
    .number()
    .min(FIELD_LIMITS.RESERVATION_MIN_ATTENDEES, VALIDATION_MESSAGES.MIN_VALUE('El número de asistentes', FIELD_LIMITS.RESERVATION_MIN_ATTENDEES))
    .max(FIELD_LIMITS.RESERVATION_MAX_ATTENDEES, VALIDATION_MESSAGES.MAX_VALUE('El número de asistentes', FIELD_LIMITS.RESERVATION_MAX_ATTENDEES)),
}).refine(data => {
  if (!data.startTime || !data.endTime) return true;
  return data.endTime > data.startTime;
}, {
  message: VALIDATION_MESSAGES.END_TIME_BEFORE_START,
  path: ['endTime'],
});

export type ReservationFormData = z.infer<typeof reservationSchema>;
