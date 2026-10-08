import { z } from 'zod';
import { FIELD_LIMITS } from '../rules/limits';
import { VALIDATION_MESSAGES } from '../messages/es';

export const requestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(FIELD_LIMITS.TITLE_MIN_LENGTH, VALIDATION_MESSAGES.MIN_LENGTH('El título', FIELD_LIMITS.TITLE_MIN_LENGTH))
    .max(FIELD_LIMITS.TITLE_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('El título', FIELD_LIMITS.TITLE_MAX_LENGTH)),
  description: z
    .string()
    .trim()
    .min(FIELD_LIMITS.DESCRIPTION_MIN_LENGTH, VALIDATION_MESSAGES.MIN_LENGTH('La descripción del problema', FIELD_LIMITS.DESCRIPTION_MIN_LENGTH))
    .max(FIELD_LIMITS.DESCRIPTION_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('La descripción del problema', FIELD_LIMITS.DESCRIPTION_MAX_LENGTH)),
  category: z.enum([
    'Daño en Zona Común',
    'Ruido / Convivencia',
    'Petición Administrativa',
    'Mascotas',
    'Plomería',
    'Eléctrico',
    'Fachada/Paredes',
    'Otro'
  ], {
    error: 'Selecciona una categoría válida.',
  }),
  priority: z.enum(['BAJA', 'MEDIA', 'ALTA', 'URGENTE'], {
    error: 'Selecciona un nivel de prioridad válido.',
  }),
  propertyId: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.REQUIRED('La unidad o propiedad')),
});

export type RequestFormData = z.infer<typeof requestSchema>;
