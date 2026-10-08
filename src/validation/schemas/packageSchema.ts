import { z } from 'zod';
import { FIELD_LIMITS } from '../rules/limits';
import { VALIDATION_MESSAGES } from '../messages/es';

export const packageSchema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(FIELD_LIMITS.NAME_MIN_LENGTH, VALIDATION_MESSAGES.MIN_LENGTH('El nombre del destinatario', FIELD_LIMITS.NAME_MIN_LENGTH))
    .max(FIELD_LIMITS.NAME_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('El nombre del destinatario', FIELD_LIMITS.NAME_MAX_LENGTH)),
  propertyId: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.REQUIRED('La unidad o propiedad de entrega')),
  company: z
    .string()
    .trim()
    .min(2, VALIDATION_MESSAGES.MIN_LENGTH('La empresa transportadora', 2))
    .max(50, VALIDATION_MESSAGES.MAX_LENGTH('La empresa transportadora', 50)),
  trackingNumber: z
    .string()
    .trim()
    .max(FIELD_LIMITS.TRACKING_NUMBER_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('El número de guía', FIELD_LIMITS.TRACKING_NUMBER_MAX_LENGTH))
    .optional()
    .or(z.literal('')),
  observations: z
    .string()
    .trim()
    .max(FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('Las observaciones', FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH))
    .optional()
    .or(z.literal('')),
});

export type PackageFormData = z.infer<typeof packageSchema>;
