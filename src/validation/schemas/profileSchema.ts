import { z } from 'zod';
import { FIELD_LIMITS } from '../rules/limits';
import { VALIDATION_MESSAGES } from '../messages/es';

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(FIELD_LIMITS.NAME_MIN_LENGTH, VALIDATION_MESSAGES.MIN_LENGTH('El nombre completo', FIELD_LIMITS.NAME_MIN_LENGTH))
    .max(FIELD_LIMITS.NAME_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('El nombre completo', FIELD_LIMITS.NAME_MAX_LENGTH)),
  phone: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.REQUIRED('El teléfono'))
    .min(FIELD_LIMITS.PHONE_MIN_LENGTH, VALIDATION_MESSAGES.MIN_LENGTH('El teléfono', FIELD_LIMITS.PHONE_MIN_LENGTH))
    .max(FIELD_LIMITS.PHONE_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('El teléfono', FIELD_LIMITS.PHONE_MAX_LENGTH))
    .regex(/^\+?[0-9\s-]{7,20}$/, VALIDATION_MESSAGES.INVALID_PHONE),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
