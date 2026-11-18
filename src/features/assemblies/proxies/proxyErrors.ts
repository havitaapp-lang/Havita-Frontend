import { ApiError } from '../../../api/apiClient';

/**
 * Fase 2 / P6 — mensajes en español para los códigos de error REALES del backend (ver P6_API_CONTRACT_AUDIT.md). Si el
 * código no está aquí se usa el mensaje del backend, que ya viene en español y sin datos internos.
 */
const MESSAGES: Record<string, string> = {
  // Poderes
  PROXY_ALREADY_EXISTS: 'La unidad ya tiene un poder en revisión o aprobado para esta asamblea.',
  NOT_THE_OWNER: 'Solo un propietario activo de la unidad puede otorgar un poder.',
  GRANTOR_NOT_ACTIVE_OWNER: 'El otorgante ya no es propietario activo de la unidad.',
  PROXY_USER_NOT_ACTIVE_MEMBER: 'La cuenta del apoderado no tiene una membresía activa en la comunidad.',
  PROXY_CONFLICTS_WITH_DELEGATION: 'La unidad tiene una delegación de voto activa: no puede tener además un poder.',
  PROXY_BLOCKED_BY_ATTENDANCE: 'La unidad ya registró su asistencia en esta asamblea.',
  INVALID_PROXY_TRANSITION: 'El poder cambió de estado. Actualiza la lista e inténtalo de nuevo.',
  PROXY_ALREADY_USED: 'El poder ya se utilizó y no puede cambiarse.',
  PROXY_NOT_APPROVED: 'Solo un poder aprobado permite registrar la asistencia.',
  PROXY_NOT_EDITABLE: 'El documento de un poder aprobado no se reemplaza: revócalo y solicita uno nuevo.',
  PROXY_IDENTITY_MISMATCH: 'El documento presentado no coincide con el del apoderado.',
  PROXY_REPRESENTATION_LIMIT_REACHED: 'El apoderado ya representa el número máximo de unidades de la comunidad.',
  INVALID_PROXY_DOCUMENT: 'El archivo debe ser un PDF, PNG o JPEG válido.',
  PROXY_DOCUMENT_TOO_LARGE: 'El archivo supera el tamaño máximo permitido.',
  PROXY_DOCUMENT_INTEGRITY_FAILED: 'El documento almacenado no coincide con el registrado. Avisa a la administración.',
  PROXY_DOCUMENT_MISSING: 'El documento no está disponible en el almacenamiento. Avisa a la administración.',
  REJECTION_REASON_REQUIRED: 'Indica el motivo del rechazo.',
  STORAGE_UNAVAILABLE: 'El almacenamiento de documentos no está disponible. Inténtalo de nuevo en unos minutos.',
  // Asamblea y votación
  ASSEMBLY_ENDED: 'La asamblea ya finalizó.',
  ASSEMBLY_NOT_IN_PROGRESS: 'La asamblea no está en curso.',
  POLL_NOT_LIVE: 'La pregunta no está abierta.',
  PROPERTY_ALREADY_VOTED: 'La unidad ya tiene un voto vigente en esta pregunta.',
  PROPERTY_NOT_REGISTERED_IN_ASSEMBLY: 'La unidad no tiene asistencia registrada en la asamblea.',
  PROXY_NOT_USED: 'El poder no se utilizó para registrar la asistencia de la unidad.',
  ASSISTED_VOTE_ONLY_FOR_EXTERNAL_PROXY: 'El apoderado tiene cuenta Havita: debe votar él mismo.',
  VOID_ONLY_FOR_ASSISTED_VOTES: 'Solo un voto asistido puede anularse.',
  PARTICIPATION_ALREADY_VOIDED: 'El voto ya estaba anulado.',
  REISSUE_NOT_ALLOWED: 'Solo se puede volver a emitir el voto asistido anulado del mismo apoderado.',
  VOIDED_VOTE_REVOTE_NOT_AUTHORIZED: 'El voto de esta unidad fue anulado; por esta vía no se admite una nueva emisión.',
  VOTE_LEDGER_REQUIRED: 'El voto mediante poder no está disponible en este entorno.',
  INVALID_VOTE_OPTIONS: 'Revisa las opciones elegidas.',
  // Designación administrativa (P7 · G3)
  EVIDENCE_TYPE_REQUIRED: 'Indica cómo se recibió el poder firmado por el otorgante.',
  GRANTOR_CONSENT_ATTESTATION_REQUIRED: 'Confirma que el documento adjunto es el poder firmado por el otorgante.',
  EVIDENCE_NOT_APPLICABLE: 'La evidencia administrativa solo se indica cuando la administración registra el poder.',
  GRANTOR_REQUIRED: 'Elige el propietario que otorga el poder.',
  // Límites
  INVALID_PROXY_LIMIT: 'El límite debe ser un número entero positivo, o vacío para no limitar.',
  PROXY_SETTINGS_SCHEMA_REQUIRED: 'La configuración por comunidad no está disponible en este entorno.',
  INVALID_PAGE: 'Página no válida.',
};

export function errorCode(error: unknown): string | null {
  if (error instanceof ApiError && error.data && typeof error.data === 'object') {
    const code = (error.data as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

/** Mensaje para mostrar al usuario: el del código conocido, el del backend o uno genérico según el estado HTTP. */
export function proxyErrorMessage(error: unknown, fallback = 'No se pudo completar la operación.'): string {
  const code = errorCode(error);
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (error instanceof ApiError) {
    if (error.status === 404) return 'No encontrado o no disponible para tu cuenta en esta comunidad.';
    if (error.status === 403 || error.status === 401) return 'No tienes permiso para esta operación (o tu sesión cambió).';
    if (error.status === 503) return MESSAGES.STORAGE_UNAVAILABLE;
    if (error.message) return error.message;
  }
  return fallback;
}

/**
 * ¿La ruta no existe en este backend (bandera de poderes apagada)? El backend responde 404 con el código
 * ENDPOINT_NOT_FOUND para una ruta inexistente; un recurso inexistente trae su propio código (p. ej. ASSEMBLY_NOT_FOUND).
 */
export function isFeatureUnavailable(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 404) return false;
  const code = errorCode(error);
  return !code || code === 'ENDPOINT_NOT_FOUND';
}
