import { z } from 'zod';
import { FIELD_LIMITS } from '../rules/limits';
import { VALIDATION_MESSAGES } from '../messages/es';

export const documentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(FIELD_LIMITS.TITLE_MIN_LENGTH, VALIDATION_MESSAGES.MIN_LENGTH('El título del documento', FIELD_LIMITS.TITLE_MIN_LENGTH))
    .max(FIELD_LIMITS.TITLE_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('El título del documento', FIELD_LIMITS.TITLE_MAX_LENGTH)),
  category: z.enum(['Reglamento', 'Actas', 'Financiero', 'Convivencia', 'Otro'], {
    error: 'Selecciona una categoría válida.',
  }),
  description: z
    .string()
    .trim()
    .max(FIELD_LIMITS.DESCRIPTION_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('La descripción', FIELD_LIMITS.DESCRIPTION_MAX_LENGTH))
    .optional()
    .or(z.literal('')),
});

export type DocumentFormData = z.infer<typeof documentSchema>;
