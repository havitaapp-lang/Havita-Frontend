import { z } from 'zod';
import { FIELD_LIMITS } from '../rules/limits';
import { VALIDATION_MESSAGES } from '../messages/es';

export const visitorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(FIELD_LIMITS.NAME_MIN_LENGTH, VALIDATION_MESSAGES.MIN_LENGTH('El nombre del visitante', FIELD_LIMITS.NAME_MIN_LENGTH))
    .max(FIELD_LIMITS.NAME_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('El nombre del visitante', FIELD_LIMITS.NAME_MAX_LENGTH)),
  documentId: z
    .string()
    .trim()
    .min(FIELD_LIMITS.DOCUMENT_MIN_LENGTH, VALIDATION_MESSAGES.MIN_LENGTH('El documento de identidad', FIELD_LIMITS.DOCUMENT_MIN_LENGTH))
    .max(FIELD_LIMITS.DOCUMENT_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('El documento de identidad', FIELD_LIMITS.DOCUMENT_MAX_LENGTH)),
  propertyId: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.REQUIRED('La propiedad de destino')),
  vehiclePlate: z
    .string()
    .trim()
    .max(FIELD_LIMITS.VEHICLE_PLATE_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('La placa vehicular', FIELD_LIMITS.VEHICLE_PLATE_MAX_LENGTH))
    .optional()
    .or(z.literal('')),
  observations: z
    .string()
    .trim()
    .max(FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('Las observaciones', FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH))
    .optional()
    .or(z.literal('')),
});

export type VisitorFormData = z.infer<typeof visitorSchema>;
