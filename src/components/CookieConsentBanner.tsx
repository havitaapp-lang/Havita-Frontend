import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck, X } from 'lucide-react';

const STORAGE_KEY = 'havita_cookie_consent';

export type CookieConsentType = 'all' | 'essential' | null;

export const CookieConsentBanner: React.FC = () => {
  const [consent, setConsent] = useState<CookieConsentType>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as CookieConsentType;
      if (stored === 'all' || stored === 'essential') {
        return stored;
      }
    } catch {
      // Ignorar fallos de almacenamiento
    }
    return null;
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (consent === null) {
      // Retardo sutil para no interrumpir el primer paint visual
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [consent]);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'all');
    } catch {
      // Ignorar fallos de almacenamiento
    }
    setConsent('all');
    setIsVisible(false);
  };

  const handleAcceptEssential = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'essential');
    } catch {
      // Ignorar fallos de almacenamiento
    }
    setConsent('essential');
    setIsVisible(false);
  };

  if (!isVisible || consent !== null) {
    return null;
  }

  return (
    <aside 
      role="region" 
      aria-label="Aviso de privacidad y uso de cookies"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-fade-in"
    >
      <div className="relative bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/90 text-slate-900 overflow-hidden">
        {/* Glow de acento superior */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-emerald-500" />

        <div className="flex items-start gap-3.5 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
            <Cookie className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-sm font-bold text-[#16345F] leading-tight">
              Uso de cookies y privacidad
            </h3>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Conforme a la Ley 1581 de 2012 (Habeas Data)
            </span>
          </div>

          <button
            onClick={handleAcceptEssential}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors shrink-0"
            aria-label="Cerrar aviso usando solo cookies esenciales"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          Utilizamos cookies esenciales para garantizar la seguridad, autenticación multi-inquilino y navegación en la plataforma. Puedes aceptar todas las cookies o limitar el uso exclusivamente a las técnicas esenciales.{' '}
          <Link 
            to="/legal/privacidad" 
            className="text-blue-600 hover:text-blue-700 underline font-semibold transition-colors"
          >
            Ver política de cookies
          </Link>.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <button
            onClick={handleAcceptAll}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-[#16345F] hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs transition-all shadow-sm text-center cursor-pointer"
          >
            Aceptar todas
          </button>

          <button
            onClick={handleAcceptEssential}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-xs transition-all text-center cursor-pointer border border-slate-200"
          >
            Solo esenciales
          </button>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Datos cifrados y protegidos</span>
          </div>
          <Link to="/legal/terminos" className="hover:text-slate-600 transition-colors">
            Términos
          </Link>
        </div>
      </div>
    </aside>
  );
};
