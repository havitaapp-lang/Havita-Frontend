import { z } from 'zod';

export interface FormValidationResult<T> {
  success: boolean;
  data?: T;
  errors: Record<string, string>;
  errorList: Array<{ field: string; message: string }>;
}

/**
 * Validador seguro para formularios usando Zod.
 * Transforma los issues de Zod en un diccionario accesible y una lista para resúmenes.
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): FormValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: {},
      errorList: [],
    };
  }

  const errors: Record<string, string> = {};
  const errorList: Array<{ field: string; message: string }> = [];

  for (const issue of result.error.issues) {
    const field = issue.path.join('.') || 'form';
    if (!errors[field]) {
      errors[field] = issue.message;
      errorList.push({ field, message: issue.message });
    }
  }

  return {
    success: false,
    errors,
    errorList,
  };
}

/**
 * Mueve el foco y el scroll al primer campo con error de forma accesible.
 */
export function focusField(fieldName: string) {
  const element = document.querySelector<HTMLElement>(`[name="${fieldName}"], #${fieldName}`);
  if (element) {
    element.focus();
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
