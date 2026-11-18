import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, Users, Home, Package, ShieldCheck, Wrench, 
  Calendar, FileText, Bell, Settings, LogOut, Menu, X,
  UserCheck, Vote, CalendarDays, ClipboardList, ShoppingBag,
  PhoneCall, UserCircle, ChevronDown, MessageCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { TenantSwitcher } from '../components/TenantSwitcher';
import { CommandPalette } from '../components/CommandPalette';
import { ImpersonationBanner } from '../components/superAdmin/ImpersonationBanner';
import { useTenant } from '../contexts/TenantContext';
import { SuspendedTenantLock } from '../components/SuspendedTenantLock';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { currentTenant } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Iniciales del usuario para el avatar
  const userInitials = (user?.name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // If not authenticated or neither admin nor super_admin, redirect to login
  useEffect(() => {
    if (!user || (user.role !== 'COMMUNITY_ADMIN' && user.role !== 'SUPER_ADMIN')) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user || (user.role !== 'COMMUNITY_ADMIN' && user.role !== 'SUPER_ADMIN')) return null;

  if (currentTenant?.status === 'SUSPENDED' && user.role !== 'SUPER_ADMIN') {
    return <SuspendedTenantLock />;
  }

  const allNavItems = [
    { name: 'Inicio', path: '/admin', icon: <Building2 className="w-5 h-5" /> },
    { name: 'Residentes', path: '/admin/residents', icon: <Users className="w-5 h-5" /> },
    { name: 'Propiedades', path: '/admin/properties', icon: <Home className="w-5 h-5" /> },
    { name: 'Personal', path: '/admin/staff', icon: <UserCheck className="w-5 h-5" />, feature: 'staff' },
    { name: 'Turnos', path: '/admin/shifts', icon: <CalendarDays className="w-5 h-5" />, feature: 'staff' },
    { name: 'Asistencia', path: '/admin/attendance', icon: <ClipboardList className="w-5 h-5" />, feature: 'staff' },
    { name: 'Asambleas', path: '/admin/assemblies', icon: <Vote className="w-5 h-5" />, feature: 'surveys' },
    { name: 'Marketplace', path: '/admin/marketplace', icon: <ShoppingBag className="w-5 h-5" />, feature: 'marketplace' },
    { name: 'Comunicados', path: '/admin/communications', icon: <Bell className="w-5 h-5" /> },
    { name: 'Citofonía', path: '/admin/intercom', icon: <PhoneCall className="w-5 h-5" /> },
    // Fase 3: consulta (solo lectura) de la bandeja de chat de portería.
    { name: 'Chat portería', path: '/admin/chat', icon: <MessageCircle className="w-5 h-5" /> },
    { name: 'Paquetes', path: '/admin/packages', icon: <Package className="w-5 h-5" />, feature: 'packages' },
    { name: 'Visitantes', path: '/admin/visitors', icon: <ShieldCheck className="w-5 h-5" />, feature: 'visitors' },
    { name: 'PQRS & Daños', path: '/admin/requests', icon: <Wrench className="w-5 h-5" />, feature: 'pqrs' },
    { name: 'Reservas', path: '/admin/reservations', icon: <Calendar className="w-5 h-5" />, feature: 'reservations' },
    { name: 'Documentos', path: '/admin/documents', icon: <FileText className="w-5 h-5" />, feature: 'documents' },
    { name: 'Configuración', path: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const navItems = allNavItems.filter(
    (item) => !item.feature || !currentTenant?.activeFeatures || currentTenant.activeFeatures.includes(item.feature)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ImpersonationBanner />
      <div className="flex flex-1">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 transition-all border-r border-slate-800">
        <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800">
          <span className="text-white font-bold text-xl tracking-tight">Havita</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors group",
                  location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path))
                    ? "bg-(--tenant-primary) text-white" 
                    : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <span className={cn(
                  "mr-3 flex-shrink-0",
                  location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path))
                    ? "text-white" 
                    : "text-slate-400 group-hover:text-slate-300"
                )}>{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-1">
          <Link
            to="/admin/profile"
            className={cn(
              "flex w-full items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
              location.pathname === '/admin/profile'
                ? "bg-(--tenant-primary) text-white" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <UserCircle className="mr-3 h-5 w-5" />
            Mi Perfil
          </Link>
          <button onClick={logout} className="flex w-full items-center px-3 py-2 text-sm font-medium rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <LogOut className="mr-3 h-5 w-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200">
          <div className="flex items-center">
            <button 
              className="md:hidden p-2 -ml-2 mr-2 text-slate-500 hover:text-slate-700"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            
            {/* Modern Tenant Switcher */}
            <TenantSwitcher />
          </div>
          
          <div className="flex items-center gap-3">
            {/* Quick search button */}
            <button
              type="button"
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
                window.dispatchEvent(event);
              }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <span>Buscar...</span>
              <kbd className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 shadow-2xs">Ctrl+K</kbd>
            </button>
            
            {/* Avatar / User Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 p-1.5 -mr-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group text-left"
                title="Mi cuenta"
                aria-expanded={userMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {userInitials || 'AD'}
                </div>
                <div className="hidden md:block text-sm">
                  <p className="font-medium text-slate-700 leading-none group-hover:text-slate-900 transition-colors">{user?.name || 'Administrador'}</p>
                  <p className="text-slate-500 text-xs mt-1">
                    {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Administrador'}
                  </p>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform hidden sm:block", userMenuOpen ? "rotate-180" : "")} />
              </button>

              {userMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-sm font-bold text-slate-800 truncate">{user?.name || 'Administrador'}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    <span className="inline-block mt-1.5 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Administrador'}
                    </span>
                  </div>

                  {/* Mi Perfil */}
                  <Link
                    to="/admin/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg bg-(--tenant-primary)/10 flex items-center justify-center">
                      <UserCircle className="w-4 h-4 text-(--tenant-primary)" />
                    </span>
                    Mi Perfil
                  </Link>

                  {/* Cerrar sesión */}
                  <button
                    onClick={() => { setUserMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
                  >
                    <span className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                      <LogOut className="w-4 h-4 text-red-500" />
                    </span>
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile menu (Drawer) */}
        {isMobileMenuOpen && (
          <div className="md:hidden relative z-50">
            <div className="fixed inset-0 bg-slate-900/80" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-64 bg-slate-900 flex flex-col">
              <div className="h-16 flex items-center justify-between px-4 bg-slate-950">
                <span className="text-white font-bold text-xl">Havita</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-3">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center px-3 py-2.5 text-sm font-medium rounded-md",
                        location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path))
                          ? "bg-(--tenant-primary) text-white" 
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="p-4 border-t border-slate-800 space-y-1">
                <Link
                  to="/admin/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex w-full items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    location.pathname === '/admin/profile'
                      ? "bg-(--tenant-primary) text-white" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <UserCircle className="mr-3 h-5 w-5" />
                  Mi Perfil
                </Link>
                <button onClick={() => { setIsMobileMenuOpen(false); logout(); }} className="flex w-full items-center px-3 py-2 text-sm font-medium rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                  <LogOut className="mr-3 h-5 w-5" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      </div>

      {/* Global Command Palette */}
      <CommandPalette />
    </div>
  );
};
