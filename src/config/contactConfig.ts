/**
 * Configuración centralizada de datos de contacto y canales comerciales de Havita.
 * 
 * Para actualizar el número de WhatsApp oficial de atención comercial:
 * 1. Modificar la variable de entorno VITE_WHATSAPP_CONTACT_NUMBER en el archivo .env, O
 * 2. Modificar el valor por defecto de DEFAULT_WHATSAPP_NUMBER en este archivo.
 */

export const DEFAULT_WHATSAPP_NUMBER = (
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_WHATSAPP_CONTACT_NUMBER
    ? import.meta.env.VITE_WHATSAPP_CONTACT_NUMBER
    : '573001234567'
).replace(/[^0-9]/g, '');

export const CONTACT_INFO = {
  whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
  demoEmail: 'demo@havita.com.co',
  supportEmail: 'soporte@havita.com.co',
  location: 'Santiago de Cali, Colombia • Cobertura nacional',
  country: 'Colombia',
  currency: 'COP',
  regulatoryFramework: 'Ley 675 de 2001 & Ley 1581 de 2012'
};

/**
 * Genera el enlace oficial de WhatsApp con mensaje contextual codificado.
 */
export function getWhatsAppUrl(customMessage?: string): string {
  const message = customMessage || 'Hola Havita, me gustaría recibir más información sobre la plataforma para mi copropiedad.';
  return `https://wa.me/${CONTACT_INFO.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
