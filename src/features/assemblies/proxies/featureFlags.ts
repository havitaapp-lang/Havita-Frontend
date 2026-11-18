/**
 * Fase 2 / P6 — bandera de compilación de la interfaz de poderes y voto mediante poder.
 *
 * El backend no expone una ruta de capacidades: las rutas de poderes solo existen con
 * `havita.assembly-proxies.enabled=true` (si no, 404). Por eso la interfaz se oculta por defecto y solo se muestra con
 * `VITE_FEATURE_ASSEMBLY_PROXIES=true` en el entorno de compilación (el sandbox de pruebas). Si la interfaz está
 * activa y el backend no, cada pantalla muestra «no disponible» (404 de ruta). No es un control de seguridad: toda
 * decisión la toma el backend.
 */
export function isAssemblyProxiesEnabled(env: Record<string, unknown> = import.meta.env): boolean {
  return env.VITE_FEATURE_ASSEMBLY_PROXIES === 'true';
}
