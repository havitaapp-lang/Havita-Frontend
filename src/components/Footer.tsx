import React from 'react';
import { Logo } from './Logo';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const scrollTo = (id: string) => {
    if (id === 'inicio') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-white border-t border-[#E5EAF0] pt-14 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Row: Logo, Navigation, Social */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10">
          
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <Logo size="md" />
            <p className="text-xs text-[#667085] mt-2 font-medium">
              Tu comunidad, todo en un solo lugar.
            </p>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-wrap justify-center gap-6 sm:gap-8 text-xs font-semibold text-[#16345F]">
            <button onClick={() => scrollTo('inicio')} className="hover:text-[var(--tenant-primary)] transition-colors">
              Inicio
            </button>
            <button onClick={() => scrollTo('features')} className="hover:text-[var(--tenant-primary)] transition-colors">
              Características
            </button>
            <button onClick={() => scrollTo('modules')} className="hover:text-[var(--tenant-primary)] transition-colors">
              Módulos
            </button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-[var(--tenant-primary)] transition-colors">
              Precios
            </button>
            <button onClick={() => scrollTo('social-proof')} className="hover:text-[var(--tenant-primary)] transition-colors">
              Casos de éxito
            </button>
            <button onClick={() => scrollTo('faq')} className="hover:text-[var(--tenant-primary)] transition-colors">
              FAQ
            </button>
          </nav>

          {/* Social Icons (SVGs for LinkedIn, Instagram, YouTube) */}
          <div className="flex items-center gap-4 text-slate-400">
            {/* LinkedIn */}
            <a 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noreferrer"
              aria-label="LinkedIn"
              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64c-.9 0-1.63.73-1.63 1.63 0 .9.73 1.63 1.63 1.63.9 0 1.63-.73 1.63-1.63 0-.9-.73-1.63-1.63-1.63Z" />
              </svg>
            </a>

            {/* Instagram */}
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noreferrer"
              aria-label="Instagram"
              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:text-pink-600 hover:border-pink-300 hover:bg-pink-50/50 transition-all"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>

            {/* YouTube */}
            <a 
              href="https://youtube.com" 
              target="_blank" 
              rel="noreferrer"
              aria-label="YouTube"
              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:text-red-600 hover:border-red-300 hover:bg-red-50/50 transition-all"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          </div>

        </div>

        {/* Divider & Copyright */}
        <div className="border-t border-[#E5EAF0] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#667085]">
          <p>© {new Date().getFullYear()} Havita. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link to="/legal/terminos" className="hover:underline cursor-pointer">Términos de servicio</Link>
            <Link to="/legal/privacidad" className="hover:underline cursor-pointer">Política de privacidad</Link>
            <Link to="/legal/seguridad" className="hover:underline cursor-pointer">Seguridad</Link>
          </div>
        </div>

      </div>
    </footer>
  );
};
