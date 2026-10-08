/**
 * Colombian and Latin American formatting utilities for Havita SaaS.
 */

/**
 * Formats a number as Colombian Pesos (COP).
 * Example: 350000 -> "$ 350.000 COP" or "$ 350.000"
 */
export function formatCurrencyCOP(amount: number, includeCurrency = true): string {
  if (isNaN(amount)) return '$ 0';
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
  return includeCurrency ? formatted + ' COP' : formatted;
}

/**
 * Formats ISO date string to DD/MM/YYYY.
 * Example: "2026-09-14T14:30:00Z" -> "14/09/2026"
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Formats ISO date string to DD/MM/YYYY hh:mm a.
 * Example: "2026-09-14T14:30:00Z" -> "14/09/2026 02:30 p. m."
 */
export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Formats ISO date string to relative time (e.g. "Hace 5 minutos", "Hace 2 horas").
 */
export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Hace un momento';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return 'Hace ' + diffInMinutes + ' min';
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return 'Hace ' + diffInHours + ' h';
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return 'Hace ' + diffInDays + ' d';
    return formatDate(dateString);
  } catch {
    return dateString;
  }
}

/**
 * Formats Colombian mobile phone numbers (+57 3XX XXX XXXX)
 */
export function formatPhoneCO(phone?: string | null): string {
  if (!phone) return '-';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  return phone;
}

/**
 * Formats an ISO date string to a friendly format (e.g., "Hoy, 4:00 PM", "Mañana, 10:00 AM")
 */
export function formatFriendlyDateTime(dtStr?: string | null): string | undefined {
  if (!dtStr) return undefined;

  if (dtStr.startsWith('Hoy') || dtStr.startsWith('Mañana') || dtStr.includes(' AM') || dtStr.includes(' PM')) {
    return dtStr;
  }

  try {
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return dtStr;

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) return `Hoy, ${timeStr}`;
    if (isTomorrow) return `Mañana, ${timeStr}`;

    return `${d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}, ${timeStr}`;
  } catch {
    return dtStr;
  }
}

/**
 * Formats a Colombian NIT input progressively as 901.456.789-0
 * Allows only digits, dots, and hyphen. Max 10 digits (9 base + 1 verification digit).
 */
export function formatNitInput(value: string): string {
  if (!value) return '';
  const hasExplicitHyphen = value.includes('-');
  const parts = value.split('-');
  const rawBase = parts[0].replace(/\D/g, '');

  const baseDigits = rawBase.slice(0, 9);
  let checkDigit = '';

  if (hasExplicitHyphen) {
    checkDigit = parts.slice(1).join('').replace(/\D/g, '').slice(0, 1);
  } else if (rawBase.length > 9) {
    checkDigit = rawBase.slice(9, 10);
  }

  let formattedBase = baseDigits;
  if (baseDigits.length > 6) {
    formattedBase = `${baseDigits.slice(0, 3)}.${baseDigits.slice(3, 6)}.${baseDigits.slice(6)}`;
  } else if (baseDigits.length > 3) {
    formattedBase = `${baseDigits.slice(0, 3)}.${baseDigits.slice(3)}`;
  }

  if (checkDigit) {
    return `${formattedBase}-${checkDigit}`;
  }
  if (hasExplicitHyphen && baseDigits.length >= 6) {
    return `${formattedBase}-`;
  }
  return formattedBase;
}

/**
 * Validates whether a NIT string has a valid Colombian NIT structure (8 to 9 base digits, optional verification digit).
 */
export function isValidNit(nit: string): boolean {
  if (!nit) return false;
  const digitsOnly = nit.replace(/\D/g, '');
  return digitsOnly.length >= 8 && digitsOnly.length <= 10;
}

/**
 * Formats a phone number input progressively (+57 300 123 4567 or 300 123 4567).
 * Prevents letters and invalid symbols.
 */
export function formatPhoneInput(value: string): string {
  if (!value) return '';
  const trimmedStart = value.replace(/^\s+/, '');
  const hasPlus = trimmedStart.startsWith('+');
  const digits = trimmedStart.replace(/\D/g, '');

  if (!hasPlus && digits.length === 0) return '';
  if (hasPlus && digits.length === 0) return '+';

  if (hasPlus) {
    if (digits.startsWith('57')) {
      const local = digits.slice(2, 12);
      if (local.length === 0) return '+57';
      if (local.length <= 3) return `+57 ${local}`;
      if (local.length <= 6) return `+57 ${local.slice(0, 3)} ${local.slice(3)}`;
      return `+57 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 10)}`;
    }
    const cleanIntl = digits.slice(0, 15);
    if (cleanIntl.length <= 3) return `+${cleanIntl}`;
    if (cleanIntl.length <= 6) return `+${cleanIntl.slice(0, 3)} ${cleanIntl.slice(3)}`;
    if (cleanIntl.length <= 10) return `+${cleanIntl.slice(0, 3)} ${cleanIntl.slice(3, 6)} ${cleanIntl.slice(6)}`;
    return `+${cleanIntl.slice(0, 3)} ${cleanIntl.slice(3, 6)} ${cleanIntl.slice(6, 10)} ${cleanIntl.slice(10)}`;
  }

  const local = digits.slice(0, 10);
  if (local.length <= 3) return local;
  if (local.length <= 6) return `${local.slice(0, 3)} ${local.slice(3)}`;
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 10)}`;
}

/**
 * Formats an identity document input (CC, CE, NIT, Pasaporte): alphanumeric and hyphen only, max 20 chars.
 */
export function formatDocumentInput(value: string): string {
  if (!value) return '';
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 20);
}

/**
 * Formats a vehicle plate input: uppercase alphanumeric and optional hyphen, max 10 chars (e.g., ABC123).
 */
export function formatPlateInput(value: string): string {
  if (!value) return '';
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 10);
}

/**
 * Main Colombian cities for standardized city selection / autocomplete.
 */
export const COLOMBIAN_CITIES = [
  'Bogotá D.C.',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Pereira',
  'Santa Marta',
  'Manizales',
  'Ibagué',
  'Cúcuta',
  'Villavicencio',
  'Envigado',
  'Sabaneta',
  'Rionegro',
  'Bello',
  'Itagüí',
  'Chía',
  'Cajicá',
  'Soacha',
  'Armenia',
  'Montería',
  'Neiva',
  'Pasto',
  'Popayán',
  'Tunja',
  'Valledupar',
  'Sincelejo',
  'Riohacha',
  'Yopal',
] as const;
