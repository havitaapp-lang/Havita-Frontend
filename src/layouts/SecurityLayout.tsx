import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';
import { ShieldCheck, ShieldAlert, Package, Users, LogOut, PhoneCall, UserCircle, ChevronDown, MessageCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { useChatUnread } from '../features/chat/useChatUnread';
import { SuspendedTenantLock } from '../components/SuspendedTenantLock';

export const SecurityLayout = () => {
  const { user, logout } = useAuth();
  const { currentTenant } = useTenant();
  const { activePanicAlerts } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Iniciales del vigilante/portero
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

  useEffect(() => {
    if (!user || user.role !== 'SECURITY') {
      navigate('/login');
    }
  }, [user, navigate]);

  // Fase 3: conversaciones que requieren atención (pendientes y propias con mensajes sin leer).
  const chatPending = useChatUnread(user?.role, user?.id);

  if (!user || user.role !== 'SECURITY') return null;

  if (currentTenant?.status === 'SUSPENDED') {
    return <SuspendedTenantLock />;
  }

  const allNavItems = [
    { name: 'Dashboard', path: '/security', icon: <ShieldCheck className="w-6 h-6" /> },
    { name: 'Citofonía', path: '/security/intercom', icon: <PhoneCall className="w-6 h-6" /> },
    { name: 'Alertas', path: '/security/alerts', icon: <ShieldAlert className="w-6 h-6" />, badge: activePanicAlerts.length > 0 ? activePanicAlerts.length : undefined },
    { name: 'Chat', path: '/security/chat', icon: <MessageCircle className="w-6 h-6" />, badge: chatPending > 0 ? chatPending : undefined },
    { name: 'Visitantes', path: '/security/visitors', icon: <Users className="w-6 h-6" />, feature: 'visitors' },
    { name: 'Paquetes', path: '/security/packages', icon: <Package className="w-6 h-6" />, feature: 'packages' },
  ];

  const navItems = allNavItems.filter(
    (item) => !item.feature || !currentTenant?.activeFeatures || currentTenant.activeFeatures.includes(item.feature)
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900 text-white h-16 flex items-center justify-between px-6 shrink-0 relative z-40">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded bg-(--tenant-primary) flex items-center justify-center font-bold text-xs text-white">
            {currentTenant?.logo}
          </div>
          <div>
            <h1 className="font-bold tracking-tight leading-none text-lg">Portería Principal</h1>
            <p className="text-slate-400 text-xs mt-1">{currentTenant?.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Avatar / User Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button 
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-3 p-1.5 -mr-1 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer group text-left"
              title="Mi cuenta"
              aria-expanded={userMenuOpen}
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white group-hover:text-slate-200 transition-colors">{user.name}</p>
                <p className="text-xs text-slate-400">Turno Activo</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs border border-white/20">
                {userInitials || 'PG'}
              </div>
              <ChevronDown className={cn("w-4 h-4 text-slate-400 group-hover:text-white transition-transform hidden sm:block", userMenuOpen ? "rotate-180" : "")} />
            </button>

            {userMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User info */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-sm font-bold text-slate-800 truncate">{user?.name || 'Vigilante'}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  <span className="inline-block mt-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Seguridad • Turno Activo
                  </span>
                </div>

                {/* Mi Perfil */}
                <Link
                  to="/security/profile"
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

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: icon+text on md+, icon-vertical on sm, hidden on mobile */}
        <aside className="hidden sm:flex w-20 md:w-64 bg-white border-r border-slate-200 flex-col shrink-0 justify-between">
          <nav className="flex-1 flex flex-col gap-2 p-3 md:p-4 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/security' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "flex flex-col md:flex-row items-center md:justify-start justify-center gap-1.5 md:gap-3.5 p-3 rounded-xl transition-all min-h-[48px]",
                    isActive 
                      ? "bg-slate-900 text-white shadow-sm" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center shrink-0",
                    isActive ? "text-white" : "text-slate-400"
                  )}>
                    {item.icon}
                  </div>
                  <span className="text-[11px] md:text-sm font-semibold">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 md:p-4 border-t border-slate-100 space-y-1">
            <Link
              to="/security/profile"
              className={cn(
                "flex flex-col md:flex-row items-center md:justify-start justify-center gap-1.5 md:gap-3.5 p-3 rounded-xl transition-all min-h-[48px]",
                location.pathname === '/security/profile'
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className={cn(
                "flex items-center justify-center shrink-0",
                location.pathname === '/security/profile' ? "text-white" : "text-slate-400"
              )}>
                <UserCircle className="w-6 h-6" />
              </div>
              <span className="text-[11px] md:text-sm font-semibold">Mi Perfil</span>
            </Link>
            <button
              onClick={logout}
              className="flex flex-col md:flex-row items-center md:justify-start justify-center gap-1.5 md:gap-3.5 p-3 rounded-xl transition-all min-h-[48px] w-full text-slate-600 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="w-5 h-5 md:w-6 md:h-6 shrink-0 text-slate-400 group-hover:text-rose-500" />
              <span className="text-[11px] md:text-sm font-semibold">Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 pb-20 sm:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation (< sm) with Safe Area support */}
      <nav 
        className="sm:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white border-t border-slate-800 px-2 flex justify-around items-center h-16 shrink-0 z-30 shadow-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/security' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-colors min-h-[44px]",
                isActive ? "text-(--tenant-primary)" : "text-slate-400 hover:text-white"
              )}
            >
              <div className={cn("p-1 rounded-lg", isActive && "bg-slate-800")}>
                {item.icon}
              </div>
              <span className="text-[10px] font-semibold">{item.name}</span>
            </Link>
          );
        })}
        <Link
          to="/security/profile"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-colors min-h-[44px]",
            location.pathname === '/security/profile' ? "text-(--tenant-primary)" : "text-slate-400 hover:text-white"
          )}
        >
          <div className={cn("p-1 rounded-lg", location.pathname === '/security/profile' && "bg-slate-800")}>
            <UserCircle className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold">Perfil</span>
        </Link>
      </nav>
    </div>
  );
};
