import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { ArrowRight, Menu, X } from 'lucide-react';
import { getBaseDomain } from '../utils/domainUtils';

interface NavbarProps {
  onOpenDemo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDemo }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <header 
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100' 
          : 'bg-white border-b border-slate-100/80'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Left: Logo */}
        <Link to="/" className="flex items-center hover:opacity-95 transition-opacity">
          <Logo size="md" />
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8">
          <button 
            onClick={() => {
              setActiveSection('inicio');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`text-sm font-semibold transition-colors relative py-1 ${
              activeSection === 'inicio' ? 'text-[#16345F]' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inicio
            {activeSection === 'inicio' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--tenant-primary)] rounded-full" />
            )}
          </button>

          <button 
            onClick={() => scrollToSection('features')}
            className={`text-sm font-medium transition-colors hover:text-slate-900 ${
              activeSection === 'features' ? 'text-[var(--tenant-primary)] font-semibold' : 'text-slate-600'
            }`}
          >
            Características
          </button>

          <button 
            onClick={() => scrollToSection('modules')}
            className={`text-sm font-medium transition-colors hover:text-slate-900 ${
              activeSection === 'modules' ? 'text-[var(--tenant-primary)] font-semibold' : 'text-slate-600'
            }`}
          >
            Módulos
          </button>

          <button 
            onClick={() => scrollToSection('pricing')}
            className={`text-sm font-medium transition-colors hover:text-slate-900 ${
              activeSection === 'pricing' ? 'text-[var(--tenant-primary)] font-semibold' : 'text-slate-600'
            }`}
          >
            Precios
          </button>

          <button 
            onClick={() => scrollToSection('social-proof')}
            className={`text-sm font-medium transition-colors hover:text-slate-900 ${
              activeSection === 'social-proof' ? 'text-[var(--tenant-primary)] font-semibold' : 'text-slate-600'
            }`}
          >
            Casos de éxito
          </button>

          <button 
            onClick={() => scrollToSection('faq')}
            className={`text-sm font-medium transition-colors hover:text-slate-900 ${
              activeSection === 'faq' ? 'text-[var(--tenant-primary)] font-semibold' : 'text-slate-600'
            }`}
          >
            Preguntas frecuentes
          </button>
        </nav>

        {/* Right: Actions */}
        <div className="hidden sm:flex items-center gap-5">
          <button
            onClick={onOpenDemo}
            className="px-6 py-2.5 rounded-full bg-[var(--tenant-primary)] hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5"
          >
            Solicitar una demo
          </button>

          <a 
            href={`${window.location.protocol}//admin.${getBaseDomain(window.location.hostname)}${window.location.port ? `:${window.location.port}` : ''}/login`}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#16345F] hover:text-[var(--tenant-primary)] transition-colors py-2 px-1 group"
          >
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            <span>Iniciar sesión</span>
          </a>
        </div>

        {/* Mobile menu trigger button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={onOpenDemo}
            className="px-3.5 py-1.5 rounded-full bg-[var(--tenant-primary)] text-white text-xs font-semibold shadow-sm"
          >
            Demo
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 animate-fade-in shadow-xl">
          <button 
            onClick={() => {
              setActiveSection('inicio');
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Inicio
          </button>
          <button 
            onClick={() => scrollToSection('features')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Características
          </button>
          <button 
            onClick={() => scrollToSection('modules')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Módulos
          </button>
          <button 
            onClick={() => scrollToSection('pricing')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Precios
          </button>
          <button 
            onClick={() => scrollToSection('social-proof')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Casos de éxito
          </button>
          <button 
            onClick={() => scrollToSection('faq')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Preguntas frecuentes
          </button>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDemo?.();
              }}
              className="w-full py-3 rounded-full bg-[var(--tenant-primary)] text-white font-semibold text-sm text-center shadow-md"
            >
              Solicitar una demo
            </button>
            <a 
              href={`${window.location.protocol}//admin.${getBaseDomain(window.location.hostname)}${window.location.port ? `:${window.location.port}` : ''}/login`}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 rounded-full border border-slate-200 text-slate-700 font-semibold text-sm text-center flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4" /> Iniciar sesión
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
