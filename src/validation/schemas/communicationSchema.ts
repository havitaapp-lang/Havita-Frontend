import { z } from 'zod';
import { FIELD_LIMITS } from '../rules/limits';
import { VALIDATION_MESSAGES } from '../messages/es';

export const communicationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(FIELD_LIMITS.TITLE_MIN_LENGTH, VALIDATION_MESSAGES.MIN_LENGTH('El título del comunicado', FIELD_LIMITS.TITLE_MIN_LENGTH))
    .max(FIELD_LIMITS.TITLE_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('El título del comunicado', FIELD_LIMITS.TITLE_MAX_LENGTH)),
  content: z
    .string()
    .trim()
    .min(FIELD_LIMITS.DESCRIPTION_MIN_LENGTH, VALIDATION_MESSAGES.MIN_LENGTH('El contenido del comunicado', FIELD_LIMITS.DESCRIPTION_MIN_LENGTH))
    .max(FIELD_LIMITS.DESCRIPTION_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('El contenido del comunicado', FIELD_LIMITS.DESCRIPTION_MAX_LENGTH)),
  audience: z.string().trim().min(1, 'Selecciona una audiencia válida.'),
  category: z.string().trim().min(1, VALIDATION_MESSAGES.REQUIRED('La categoría')),
  status: z.enum(['PUBLISHED', 'DRAFT'], {
    error: 'Selecciona un estado válido.',
  }),
});

export type CommunicationFormData = z.infer<typeof communicationSchema>;
