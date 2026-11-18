import React from 'react';
import { Logo } from './Logo';
import { Link } from 'react-router-dom';
import { Mail, ShieldCheck, MapPin, MessageCircle } from 'lucide-react';
import { getWhatsAppUrl } from '../config/contactConfig';

export const Footer: React.FC = () => {
  const scrollTo = (id: string) => {
    if (id === 'inicio') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const elem = document.getElementById(id);
    if (elem) {
      const yOffset = -80;
      const y = elem.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-slate-900 text-white border-t border-slate-800 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid: 4 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          
          {/* Col 1 & 2: Brand & Proposition */}
          <div className="lg:col-span-2">
            <Link 
              to="/" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 mb-4 hover:opacity-95 transition-opacity cursor-pointer"
            >
              <Logo size="md" />
            </Link>
            <p className="text-sm text-slate-400 mb-5 max-w-sm leading-relaxed">
              Plataforma SaaS para la gestión moderna, segura y eficiente de conjuntos residenciales y copropiedades en Colombia.
            </p>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Santiago de Cali, Colombia • Cobertura nacional</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <a href="mailto:demo@havita.com.co" className="hover:text-blue-400 transition-colors">
                  demo@havita.com.co (Demostraciones)
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <a href="mailto:soporte@havita.com.co" className="hover:text-blue-400 transition-colors">
                  soporte@havita.com.co (Mesa de ayuda)
                </a>
              </div>
            </div>
          </div>

          {/* Col 3: Navegación de Plataforma */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
              Plataforma
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
              <li>
                <button onClick={() => scrollTo('modules')} className="hover:text-white transition-colors text-left">
                  Módulos de gestión
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('how-it-works')} className="hover:text-white transition-colors text-left">
                  Cómo funciona
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('social-proof')} className="hover:text-white transition-colors text-left">
                  Programa Conjuntos Pioneros
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('infrastructure')} className="hover:text-white transition-colors text-left">
                  Infraestructura Cloud
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('pricing')} className="hover:text-white transition-colors text-left">
                  Tarifas y Planes
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('faq')} className="hover:text-white transition-colors text-left">
                  Preguntas frecuentes
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Marco Legal y Regulatorio */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
              Marco Legal (Colombia)
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
              <li>
                <Link to="/legal/terminos" className="hover:text-white transition-colors">
                  Términos y condiciones
                </Link>
              </li>
              <li>
                <Link to="/legal/privacidad" className="hover:text-white transition-colors">
                  Política de tratamiento de datos
                </Link>
              </li>
              <li>
                <Link to="/legal/aviso-privacidad" className="hover:text-white transition-colors">
                  Aviso de privacidad
                </Link>
              </li>
              <li>
                <Link to="/legal/seguridad" className="hover:text-white transition-colors">
                  Protocolos de seguridad
                </Link>
              </li>
              <li className="pt-2 text-[11px] text-slate-500">
                Alineado con Ley 675/2001 y Ley 1581/2012
              </li>
            </ul>
          </div>

          {/* Col 5: Proveedores & Confianza */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
              Infraestructura
            </h4>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Desplegado con alta disponibilidad y seguridad global:
            </p>
            <div className="space-y-2 text-xs">
              <div className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 font-semibold flex items-center justify-between">
                <span>Cloudflare</span>
                <span className="text-[10px] text-amber-400">DDoS & WebRTC</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 font-semibold flex items-center justify-between">
                <span>Railway</span>
                <span className="text-[10px] text-purple-400">Cloud Compute</span>
              </div>
            </div>

            <div className="mt-4">
              <a
                href={getWhatsAppUrl('Hola, quisiera información sobre Havita para mi conjunto residencial.')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                Atención vía WhatsApp
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Row: Copyright & Regulatory Notice */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Havita SaaS. Todos los derechos reservados. Colombia.</p>
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Plataforma Cloud Multi-Tenant Segura</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
