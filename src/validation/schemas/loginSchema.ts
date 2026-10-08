import { z } from 'zod';
import { FIELD_LIMITS } from '../rules/limits';
import { VALIDATION_MESSAGES } from '../messages/es';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .max(FIELD_LIMITS.EMAIL_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('El correo electrónico', FIELD_LIMITS.EMAIL_MAX_LENGTH))
    .email(VALIDATION_MESSAGES.INVALID_EMAIL),
  password: z
    .string()
    .min(FIELD_LIMITS.PASSWORD_MIN_LENGTH, VALIDATION_MESSAGES.MIN_LENGTH('La contraseña', FIELD_LIMITS.PASSWORD_MIN_LENGTH))
    .max(FIELD_LIMITS.PASSWORD_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('La contraseña', FIELD_LIMITS.PASSWORD_MAX_LENGTH)),
});

export type LoginFormData = z.infer<typeof loginSchema>;
