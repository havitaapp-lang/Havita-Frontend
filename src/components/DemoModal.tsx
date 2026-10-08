import React, { useState } from 'react';
import { X, CheckCircle2, Building2, User, Mail, Phone, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CharacterCounter } from './ui/CharacterCounter';
import { FIELD_LIMITS } from '../validation/rules/limits';
import { formatPhoneInput } from '../utils/formatters';
import { sanitizeEmailInput } from '../utils/sanitizers';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoModal: React.FC<DemoModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { loginAs } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    communityName: '',
    units: '100-300',
    email: '',
    phone: '',
    role: 'Administrador'
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleGoToDemo = () => {
    loginAs('COMMUNITY_ADMIN', 'tenant-limonar');
    onClose();
    navigate('/admin');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background gradient element */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Demostración guiada sin compromiso
            </div>

            <h3 className="text-2xl font-bold text-[#16345F] mb-2 tracking-tight">
              Solicita una demo de Havita
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Descubre cómo digitalizar la portería, los pagos, las reservas y la comunicación de tu conjunto residencial.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="demo-name" className="block text-xs font-semibold text-slate-700">Nombre completo <span className="text-rose-500">*</span></label>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="demo-community" className="block text-xs font-semibold text-slate-700">Nombre del conjunto / edificio <span className="text-rose-500">*</span></label>
                    <CharacterCounter current={formData.communityName.length} max={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH} />
                  </div>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input 
                      id="demo-community"
                      type="text"
                      required
                      maxLength={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH}
                      placeholder="Ej. Limonar Parque"
                      value={formData.communityName}
                      onChange={(e) => setFormData({...formData, communityName: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="demo-units" className="block text-xs font-semibold text-slate-700 mb-1.5">Nº de unidades aproximadas</label>
                  <select 
                    id="demo-units"
                    value={formData.units}
                    onChange={(e) => setFormData({...formData, units: e.target.value})}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                  >
                    <option value="Menos de 50">Menos de 50</option>
                    <option value="50-150">50 a 150</option>
                    <option value="150-300">150 a 300</option>
                    <option value="Más de 300">Más de 300</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="demo-email" className="block text-xs font-semibold text-slate-700 mb-1.5">Correo electrónico <span className="text-rose-500">*</span></label>
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
                  <label htmlFor="demo-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">Teléfono / WhatsApp <span className="text-rose-500">*</span></label>
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

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full py-3 px-6 rounded-full bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Solicitar mi demo personalizada <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">o si prefieres</span>
              </div>

              <button 
                type="button"
                onClick={handleGoToDemo}
                className="w-full py-2.5 px-6 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                Probar prototipo interactivo directamente
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-[#16345F] mb-2">
              ¡Solicitud recibida!
            </h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto mb-6">
              Gracias, <strong>{formData.name}</strong>. Hemos registrado tu interés para <strong>{formData.communityName}</strong>. Un asesor te contactará pronto.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleGoToDemo}
                className="py-3 px-6 rounded-full bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                Explorar el panel de control ahora <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="py-3 px-6 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
