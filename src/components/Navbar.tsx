import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { Menu, X } from 'lucide-react';

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

  const navItems = [
    { id: 'dual-platform', label: 'Plataforma' },
    { id: 'modules', label: 'Módulos' },
    { id: 'how-it-works', label: 'Cómo funciona' },
    { id: 'pricing', label: 'Precios' },
    { id: 'pioneer-program', label: 'Programa Pioneros' },
    { id: 'faq', label: 'Preguntas' },
  ];

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
        <Link 
          to="/" 
          onClick={() => {
            setActiveSection('inicio');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center hover:opacity-95 transition-opacity cursor-pointer"
        >
          <Logo size="md" />
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7">
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
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>

          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`text-sm font-medium transition-colors hover:text-slate-900 relative py-1 ${
                activeSection === item.id ? 'text-blue-600 font-semibold' : 'text-slate-600'
              }`}
            >
              {item.label}
              {activeSection === item.id && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-full border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-sm font-semibold transition-all cursor-pointer"
          >
            Ingresar a mi conjunto
          </Link>
          <button
            onClick={() => onOpenDemo?.()}
            className="px-6 py-2.5 rounded-full bg-[#16345F] hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            Solicitar demo
          </button>
        </div>

        {/* Mobile menu trigger button */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            to="/login"
            className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 text-xs font-semibold"
          >
            Ingresar
          </Link>
          <button
            onClick={() => onOpenDemo?.()}
            className="px-3.5 py-1.5 rounded-full bg-[#16345F] text-white text-xs font-semibold shadow-sm"
          >
            Demo
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Abrir menú de navegación"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 animate-fade-in shadow-xl">
          <button 
            onClick={() => {
              setActiveSection('inicio');
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="block w-full text-left py-2 px-3 rounded-lg text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Inicio
          </button>

          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="block w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {item.label}
            </button>
          ))}

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full py-2.5 rounded-full border border-slate-200 text-slate-800 font-semibold text-sm text-center hover:bg-slate-50 transition-colors"
            >
              Ingresar a mi conjunto
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDemo?.();
              }}
              className="w-full py-3 rounded-full bg-[#16345F] text-white font-semibold text-sm text-center shadow-md cursor-pointer"
            >
              Solicitar una demo
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
