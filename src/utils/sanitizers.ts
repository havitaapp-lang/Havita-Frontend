/**
 * Utilidades de sanitización y normalización del lado del cliente.
 * "El frontend debe normalizar y limitar, pero el backend debe volver a validar todo."
 */

/**
 * Normaliza un correo electrónico: trim, minúsculas, longitud máxima de 150.
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase().slice(0, 150);
}

/**
 * Limpia espacios en blanco accidentales mientras el usuario escribe un correo electrónico.
 */
export function sanitizeEmailInput(email: string): string {
  if (!email) return '';
  return email.replace(/\s+/g, '').slice(0, 150);
}

/**
 * Normaliza un teléfono: remueve caracteres no numéricos excepto el prefijo '+'.
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return (hasPlus ? '+' : '') + digits.slice(0, 20);
}

/**
 * Colapsa espacios en blanco repetidos a un solo espacio y hace trim.
 */
export function normalizeWhitespace(text: string): string {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitiza texto simple contra caracteres de control indeseados.
 * NOTA: En React, las llaves `{variable}` ya escapan HTML automáticamente.
 * Nunca usar dangerouslySetInnerHTML con datos de usuario.
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  // Remover caracteres de control excepto saltos de línea y tabs
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

/**
 * Enmascara un documento de identidad para proteger datos sensibles: '1098765432' -> '***5432'.
 */
export function maskDocument(doc: string): string {
  if (!doc) return '';
  const clean = doc.trim();
  if (clean.length <= 4) return clean;
  return '***' + clean.slice(-4);
}

/**
 * Enmascara un número telefónico: '3001234567' -> '*** *** 4567'.
 */
export function maskPhone(phone: string): string {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.length <= 4) return clean;
  return '*** *** ' + clean.slice(-4);
}

/**
 * Valida si una URL es segura para navegación.
 * Solo permite esquemas http:, https: o mailto:
 * Rechaza javascript:, data:, vbscript: u otros esquemas peligrosos.
 */
export function validateSafeUrl(url: string): { isValid: boolean; safeUrl: string } {
  if (!url) return { isValid: false, safeUrl: '#' };
  try {
    const parsed = new URL(url, window.location.origin);
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    if (allowedProtocols.includes(parsed.protocol)) {
      return { isValid: true, safeUrl: url };
    }
    return { isValid: false, safeUrl: '#' };
  } catch {
    if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) {
      return { isValid: true, safeUrl: url };
    }
    return { isValid: false, safeUrl: '#' };
  }
}
