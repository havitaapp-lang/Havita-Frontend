/**
 * Mensajes de validación centralizados y humanizados en español para Havita.
 */

export const VALIDATION_MESSAGES = {
  REQUIRED: (field: string) => `${field} es obligatorio.`,
  MIN_LENGTH: (field: string, min: number) => `${field} debe tener al menos ${min} caracteres.`,
  MAX_LENGTH: (field: string, max: number) => `${field} no puede superar los ${max} caracteres.`,
  INVALID_EMAIL: 'Ingresa un correo electrónico válido (ej. usuario@ejemplo.com).',
  INVALID_PHONE: 'Ingresa un número telefónico válido (mínimo 7 dígitos, solo números y prefijo +).',
  INVALID_DATE: 'Ingresa una fecha válida.',
  DATE_IN_PAST: 'La fecha no puede ser anterior al día de hoy.',
  END_TIME_BEFORE_START: 'La hora de finalización debe ser posterior a la hora de inicio.',
  MIN_VALUE: (field: string, min: number) => `${field} debe ser al menos ${min}.`,
  MAX_VALUE: (field: string, max: number) => `${field} no puede ser mayor a ${max}.`,
  TERMS_REQUIRED: 'Debes aceptar los términos y condiciones para continuar.',
  FILE_TOO_LARGE: (maxMb: number) => `El archivo supera el tamaño máximo permitido de ${maxMb} MB.`,
  INVALID_FILE_TYPE: (types: string) => `Tipo de archivo no permitido. Tipos permitidos: ${types}.`,
  PASSWORD_MISMATCH: 'Las contraseñas no coinciden.',
  UNAUTHORIZED_TENANT: 'No tienes autorización para acceder a esta unidad residencial.',
  INVALID_URL: 'Ingresa una URL válida con protocolo seguro (https://).',
};
