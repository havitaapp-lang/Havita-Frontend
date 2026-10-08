import { z } from 'zod';
import { FIELD_LIMITS } from '../rules/limits';
import { VALIDATION_MESSAGES } from '../messages/es';

export const propertySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, VALIDATION_MESSAGES.MIN_LENGTH('La nomenclatura', 2))
    .max(50, VALIDATION_MESSAGES.MAX_LENGTH('La nomenclatura', 50)),
  path: z
    .string()
    .trim()
    .min(2, VALIDATION_MESSAGES.MIN_LENGTH('La ubicación o ruta', 2))
    .max(FIELD_LIMITS.ADDRESS_MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('La ubicación o ruta', FIELD_LIMITS.ADDRESS_MAX_LENGTH)),
  type: z.enum(['Apartamento', 'Casa', 'Local', 'Parqueadero', 'Depósito'], {
    error: 'Selecciona un tipo de inmueble válido.',
  }),
  status: z.enum(['OCCUPIED', 'VACANT', 'MAINTENANCE', 'INACTIVE'], {
    error: 'Selecciona un estado de ocupación válido.',
  }),
});

export type PropertyFormData = z.infer<typeof propertySchema>;
