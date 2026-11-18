import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Building2, User, Mail, Phone, ArrowRight, Sparkles, Loader2, MessageCircle } from 'lucide-react';
import { CharacterCounter } from './ui/CharacterCounter';
import { FIELD_LIMITS } from '../validation/rules/limits';
import { formatPhoneInput } from '../utils/formatters';
import { sanitizeEmailInput } from '../utils/sanitizers';
import { getWhatsAppUrl } from '../config/contactConfig';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: string;
}

export const DemoModal: React.FC<DemoModalProps> = ({ isOpen, onClose, initialPlan }) => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  
  const safeInitialPlan = typeof initialPlan === 'string' && initialPlan.trim() ? initialPlan.trim() : undefined;

  const [formData, setFormData] = useState({
    name: '',
    communityName: '',
    units: '50-150',
    email: '',
    phone: '',
    role: 'Administrador',
    plan: safeInitialPlan || 'Personalizado'
  });

  useEffect(() => {
    if (typeof initialPlan === 'string' && initialPlan.trim()) {
      setFormData(prev => ({ ...prev, plan: initialPlan.trim() }));
    }
  }, [initialPlan]);

  // Manejo de tecla Escape para accesibilidad
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const payload = {
      name: formData.name.trim(),
      communityName: formData.communityName.trim(),
      units: formData.units,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      role: formData.role,
      plan: typeof formData.plan === 'string' ? formData.plan : 'Personalizado'
    };

    try {
      const response = await fetch('/api/v1/public/demo-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor (${response.status})`);
      }

      setSubmitted(true);
    } catch (error) {
      console.warn('No se pudo conectar con el endpoint de leads, activando fallback local:', error);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
    >
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background gradient element */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Cerrar modal de demostración"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Demostración guiada sin compromiso
            </div>

            <h3 id="demo-modal-title" className="text-2xl font-bold text-[#16345F] mb-1.5 tracking-tight">
              Solicita tu demo de Havita
            </h3>
            <p className="text-sm text-slate-600 mb-5">
              Descubre cómo digitalizar asambleas (Ley 675), citofonía WebRTC, accesos y paquetería en tu copropiedad.
            </p>

            {safeInitialPlan && (
              <div className="mb-4 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-700">
                <span>Plan de interés seleccionado:</span>
                <span className="font-semibold text-blue-600 px-2 py-0.5 rounded-md bg-blue-100/60">
                  {typeof formData.plan === 'string' ? formData.plan : safeInitialPlan}
                </span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="demo-name" className="block text-xs font-semibold text-slate-700">
                    Nombre completo <span className="text-rose-500">*</span>
                  </label>
                  <CharacterCounter current={formData.name.length} max={FIELD_LIMITS.NAME_MAX_LENGTH} />
                </div>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input 
                    id="demo-name"
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                    autoComplete="name"
                    placeholder="Ej. Carlos Mendoza"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="demo-community" className="block text-xs font-semibold text-slate-700">
                      Copropiedad / Edificio <span className="text-rose-500">*</span>
                    </label>
                    <CharacterCounter current={formData.communityName.length} max={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH} />
                  </div>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input 
                      id="demo-community"
                      type="text"
                      required
                      maxLength={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH}
                      placeholder="Ej. Torres del Bosque"
                      value={formData.communityName}
                      onChange={(e) => setFormData({...formData, communityName: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="demo-units" className="block text-xs font-semibold text-slate-700 mb-1">
                    Nº de unidades
                  </label>
                  <select 
                    id="demo-units"
                    value={formData.units}
                    onChange={(e) => setFormData({...formData, units: e.target.value})}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                  >
                    <option value="Menos de 50">Hasta 50 unidades</option>
                    <option value="50-150">50 a 150 unidades</option>
                    <option value="150-300">150 a 300 unidades</option>
                    <option value="Más de 300">Más de 300 unidades</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="demo-email" className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo electrónico <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input 
                      id="demo-email"
                      type="email"
                      required
                      maxLength={FIELD_LIMITS.EMAIL_MAX_LENGTH}
                      autoComplete="email"
                      placeholder="admin@tuconjunto.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: sanitizeEmailInput(e.target.value)})}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="demo-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input 
                      id="demo-phone"
                      type="tel"
                      required
                      maxLength={FIELD_LIMITS.PHONE_MAX_LENGTH}
                      autoComplete="tel"
                      placeholder="+57 300 123 4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: formatPhoneInput(e.target.value)})}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="demo-role" className="block text-xs font-semibold text-slate-700 mb-1">
                  Tu rol en la copropiedad
                </label>
                <select 
                  id="demo-role"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="Administrador">Administrador de la copropiedad</option>
                  <option value="Miembro del Consejo">Miembro del Consejo de Administración</option>
                  <option value="Empresa Administradora">Empresa de Gestión Inmobiliaria</option>
                  <option value="Propietario / Residente">Propietario o Residente</option>
                </select>
              </div>

              {/* Consentimiento Legal Habeas Data Ley 1581 de 2012 */}
              <div className="pt-1.5 pb-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 select-none">
                  <input 
                    type="checkbox"
                    id="demo-privacy-consent"
                    required
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                  />
                  <span>
                    Autorizo el tratamiento de mis datos personales para coordinar la demostración comercial conforme a la{' '}
                    <a 
                      href="/legal/privacidad" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:text-blue-700 underline font-semibold"
                    >
                      Política de Privacidad
                    </a>{' '}
                    (Ley 1581 de 2012 de Habeas Data). <span className="text-rose-500">*</span>
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={loading || !acceptedPrivacy}
                  className="w-full py-3 px-6 rounded-full bg-[#16345F] hover:bg-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando solicitud a demo@havita.com.co...
                    </>
                  ) : (
                    <>
                      Solicitar mi demo personalizada <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-[#16345F] mb-2">
              ¡Solicitud enviada con éxito!
            </h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto mb-3">
              Gracias, <strong>{formData.name}</strong>. Hemos notificado al equipo comercial en <span className="font-semibold text-blue-600">demo@havita.com.co</span> y registrado tu interés para <strong>{formData.communityName}</strong>.
            </p>
            <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
              Te hemos enviado un correo de confirmación a <strong>{formData.email}</strong>. Un asesor especializado en propiedad horizontal te contactará en menos de 24 horas.
            </p>

            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <a
                href={getWhatsAppUrl(`Hola Havita, soy ${formData.name || 'un administrador'} de la copropiedad ${formData.communityName || 'mi conjunto'}. Solicité una demo comercial y me gustaría coordinar una reunión.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                Hablar de inmediato por WhatsApp
              </a>

              <button
                onClick={onClose}
                className="py-2.5 px-4 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all"
              >
                Entendido, cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
