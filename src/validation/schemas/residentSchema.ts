import { z } from 'zod';
import { FIELD_LIMITS } from '../rules/limits';
import { VALIDATION_MESSAGES } from '../messages/es';

export const residentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(FIELD_LIMITS.NAME_MIN_LENGTH, VALIDATION_MESSAGES.MIN_LENGTH('El nombre completo', FIELD_LIMITS.NAME_MIN_LENGTH))
    .max(FIELD_LIMITS.NAME_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('El nombre completo', FIELD_LIMITS.NAME_MAX_LENGTH)),
  email: z
    .string()
    .trim()
    .max(FIELD_LIMITS.EMAIL_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('El correo electrónico', FIELD_LIMITS.EMAIL_MAX_LENGTH))
    .email(VALIDATION_MESSAGES.INVALID_EMAIL),
  phone: z
    .string()
    .trim()
    .min(FIELD_LIMITS.PHONE_MIN_LENGTH, VALIDATION_MESSAGES.MIN_LENGTH('El teléfono', FIELD_LIMITS.PHONE_MIN_LENGTH))
    .max(FIELD_LIMITS.PHONE_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('El teléfono', FIELD_LIMITS.PHONE_MAX_LENGTH))
    .regex(/^\+?[0-9\s-]{7,20}$/, VALIDATION_MESSAGES.INVALID_PHONE),
  propertyId: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.REQUIRED('La propiedad o unidad')),
  type: z.enum(['Propietario', 'Arrendatario'], {
    error: 'Selecciona si es Propietario o Arrendatario.',
  }),
  emergencyContact: z
    .string()
    .trim()
    .max(FIELD_LIMITS.PHONE_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('El contacto de emergencia', FIELD_LIMITS.PHONE_MAX_LENGTH))
    .optional()
    .or(z.literal('')),
});

export type ResidentFormData = z.infer<typeof residentSchema>;
