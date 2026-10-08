import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Logo } from '../../components/Logo';

export const LegalLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="md" />
          <nav className="flex space-x-6 text-sm font-medium text-slate-600">
            <NavLink 
              to="/legal/terminos" 
              className={({ isActive }) => isActive ? "text-brand-600" : "hover:text-brand-900 transition-colors"}
            >
              Términos
            </NavLink>
            <NavLink 
              to="/legal/privacidad" 
              className={({ isActive }) => isActive ? "text-brand-600" : "hover:text-brand-900 transition-colors"}
            >
              Privacidad
            </NavLink>
            <NavLink 
              to="/legal/seguridad" 
              className={({ isActive }) => isActive ? "text-brand-600" : "hover:text-brand-900 transition-colors"}
            >
              Seguridad
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 py-8 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} Havita. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};
