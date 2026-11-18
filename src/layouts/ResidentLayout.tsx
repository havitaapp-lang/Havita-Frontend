import { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';
import { useMyPropertyInfo } from '../hooks/useMyPropertyInfo';
import { Home, ShieldCheck, Wrench, Package, Calendar, Bell, LogOut, Sofa, ChevronDown, Building2, UserCircle, ShoppingBag, Check, AlertTriangle } from 'lucide-react';
import { useActiveUnit } from '../hooks/useActiveUnit';
import { unitLabel, unitRelations } from '../features/resident/unit/activeUnitStore';
import { useState, useRef } from 'react';
import { cn } from '../utils/cn';
import { SuspendedTenantLock } from '../components/SuspendedTenantLock';
import { FileSignature } from 'lucide-react';
import { isAssemblyProxiesEnabled } from '../features/assemblies/proxies/featureFlags';
import { ResidentIncomingCallModal } from '../features/intercom/ResidentIncomingCallModal';
import { rememberReturnTo } from '../features/auth/returnTo';
import SosButton from '../features/resident/components/SosButton';
import { MessageCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useChatUnread } from '../features/chat/useChatUnread';

export const ResidentLayout = () => {
  const { user, logout, updateUser } = useAuth() as any;
  // Fase 2 / E2: única fuente de la unidad activa (por pestaña, validada por el backend en cada petición).
  const {
    units: userProperties, activeUnitId: activePropertyId, activeLabel, status: unitStatus, notice: unitNotice,
    dismissNotice, select: switchProperty, refresh: refreshUnits, isSwitching: isSwitchingProperty,
  } = useActiveUnit();
  const { currentTenant } = useTenant();
  const { documents } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const lastSeenCount = parseInt(localStorage.getItem(`lastSeenDocCount_${currentTenant?.id}`) || '0', 10);
    const count = documents.length - lastSeenCount;
    setUnreadCount(count > 0 ? count : 0);
  }, [documents.length, currentTenant?.id]);

  useEffect(() => {
    if (location.pathname === '/resident/community') {
      localStorage.setItem(`lastSeenDocCount_${currentTenant?.id}`, documents.length.toString());
      setUnreadCount(0);
    }
  }, [location.pathname, documents.length, currentTenant?.id]);

  useEffect(() => {
    if (!user || user.role !== 'RESIDENT') {
      // P8-B: un aviso de llamada abierto sin sesión vuelve a la llamada tras iniciar sesión (solo enlaces de llamada).
      if (!user) rememberReturnTo(window.location.pathname + window.location.search);
      navigate('/login');
    }
  }, [user, navigate]);

  // Información de la unidad activa (query compartida con ResidentDashboard). Fase 2 / E2: solo sincroniza el
  // onboarding; la unidad mostrada sale de useActiveUnit (ya no se reescribe user.propertyUnit/residentPropertyId).
  // Un error aquí NO cierra la sesión: la revocación total la gestionan apiClient (ACCESS_REVOKED / 401) y el SSE;
  // una unidad no disponible (409) solo provoca refrescar la lista y volver a elegir.
  const { data: propertyInfo } = useMyPropertyInfo();

  useEffect(() => {
    const info = propertyInfo;
    if (!user || user.role !== 'RESIDENT' || !info) return;
    if (info.hasCompletedOnboarding != null && info.hasCompletedOnboarding !== user.hasCompletedOnboarding) {
      updateUser({ hasCompletedOnboarding: info.hasCompletedOnboarding });
    }
  }, [propertyInfo, user?.id]);


  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fase 3: mensajes de portería sin leer (insignia del menú «Chat»).
  const chatUnread = useChatUnread(user?.role, user?.id);

  if (!user || user.role !== 'RESIDENT') return null;

  if (currentTenant?.status === 'SUSPENDED') {
    return <SuspendedTenantLock />;
  }

  const allNavItems: { name: string; path: string; icon: ReactNode; mobileVisible: boolean; badge?: number }[] = [
    { name: 'Inicio', path: '/resident', icon: <Home className="w-5 h-5" />, mobileVisible: true },
    { name: 'Visitas', path: '/resident/visitors', icon: <ShieldCheck className="w-5 h-5" />, mobileVisible: true },
    { name: 'Chat', path: '/resident/chat', icon: <MessageCircle className="w-5 h-5" />, mobileVisible: true, badge: chatUnread },
    { name: 'Paquetes', path: '/resident/packages', icon: <Package className="w-5 h-5" />, mobileVisible: false },
    { name: 'PQRS', path: '/resident/requests', icon: <Wrench className="w-5 h-5" />, mobileVisible: true },
    { name: 'Reservas', path: '/resident/reservations', icon: <Calendar className="w-5 h-5" />, mobileVisible: false },
    { name: 'Marketplace', path: '/resident/marketplace', icon: <ShoppingBag className="w-5 h-5" />, mobileVisible: true },
    { name: 'Hogar', path: '/resident/my-home', icon: <Sofa className="w-5 h-5" />, mobileVisible: true },
    // Fase 2 / P6: poderes para asambleas (solo con la bandera de compilación).
    ...(isAssemblyProxiesEnabled()
      ? [{ name: 'Poderes', path: '/resident/proxies', icon: <FileSignature className="w-5 h-5" />, mobileVisible: false }]
      : []),
  ];

  const navItems = allNavItems;

  
  

  const handleSwitchProperty = (prop: any) => {
    switchProperty(prop.propertyId);
    setIsDropdownOpen(false);
  };
  const displayUnit = activeLabel
    || (unitStatus === 'selection-required' ? 'Selecciona tu unidad' : unitStatus === 'loading' ? 'Cargando…' : 'Mi unidad');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      {/* App Header with responsive container */}
      <header className="bg-(--tenant-primary) text-white pt-6 pb-5 px-4 sm:px-6 lg:px-8 shrink-0 rounded-b-[2rem] shadow-md z-50 relative">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 className="w-4 h-4 opacity-80" />
              <span className="text-[11px] font-bold opacity-80 uppercase tracking-wider">{currentTenant?.name}</span>
              <span className="hidden sm:inline-block text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">Portal Residente</span>
            </div>
            
            <div className="relative mt-0.5" ref={dropdownRef}>
              <div 
                className={cn("flex items-center gap-2", userProperties?.length > 1 ? "cursor-pointer hover:opacity-80 transition-opacity" : "")}
                onClick={() => userProperties?.length > 1 && setIsDropdownOpen(!isDropdownOpen)}
                role={userProperties?.length > 1 ? 'button' : undefined}
                aria-haspopup={userProperties?.length > 1 ? 'listbox' : undefined}
                aria-expanded={userProperties?.length > 1 ? isDropdownOpen : undefined}
                data-testid="unit-selector"
              >
                <h1 className="text-xl sm:text-2xl font-bold">{displayUnit}</h1>
                {userProperties?.length > 1 && (
                  <ChevronDown className={cn("w-5 h-5 transition-transform", isDropdownOpen ? "rotate-180" : "")} />
                )}
              </div>
              
              {isDropdownOpen && userProperties?.length > 1 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mis Propiedades</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {userProperties.map((p: any) => (
                      <button
                        key={p.propertyId}
                        onClick={() => handleSwitchProperty(p)}
                        aria-current={p.propertyId === activePropertyId ? 'true' : undefined}
                        data-testid="unit-option"
                        className={cn(
                          "w-full text-left px-4 py-3 flex flex-col gap-0.5 transition-colors",
                          p.propertyId === activePropertyId 
                            ? "bg-(--tenant-primary)/10" 
                            : "hover:bg-slate-50"
                        )}
                      >
                        <span className={cn(
                          "text-sm font-bold",
                          p.propertyId === activePropertyId ? "text-(--tenant-primary)" : "text-slate-800"
                        )}>
                          <span className="inline-flex items-center gap-1.5">
                            {p.propertyId === activePropertyId && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                            {unitLabel(p)}
                          </span>
                        </span>
                        <span className="text-xs text-slate-500">{unitRelations(p)} {p.isMainContact ? '(Principal)' : ''}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Tablet/Desktop Nav links */}
            <div className="hidden md:flex items-center gap-1 mr-2 bg-white/10 backdrop-blur-xs p-1 rounded-xl">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors",
                      isActive ? "bg-white text-(--tenant-primary) shadow-xs" : "text-white/80 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {item.name}
                    {!!item.badge && (
                      <span className="min-w-4 h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center" data-testid={`nav-badge-${item.path}`}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Botón SOS en mobile al lado de la campanita */}
            <SosButton variant="header" className="md:hidden" />

            <Link 
              to="/resident/community" 
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-xs hover:bg-white/30 transition-colors relative"
              title="Comunidad y Comunicados"
            >
              <Bell className="w-5 h-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-orange-500 border-2 border-[var(--tenant-primary)] w-3 h-3 rounded-full flex items-center justify-center">
                </span>
              )}
            </Link>

            {/* Avatar / User Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="w-10 h-10 rounded-full bg-white/25 hover:bg-white/35 transition-colors flex items-center justify-center font-bold text-sm text-white border-2 border-white/30"
                title="Mi cuenta"
              >
                {userInitials}
              </button>

              {userMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                  {/* Mi Perfil */}
                  <Link
                    to="/resident/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg bg-[var(--tenant-primary)]/10 flex items-center justify-center">
                      <UserCircle className="w-4 h-4 text-[var(--tenant-primary)]" />
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
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8">
        {unitNotice && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span className="flex-1">{unitNotice}</span>
            <button type="button" onClick={dismissNotice} className="text-xs font-semibold underline">Entendido</button>
          </div>
        )}
        {isSwitchingProperty || (unitStatus === 'loading' && userProperties.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-(--tenant-primary) rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium animate-pulse">Cargando informaci&oacute;n de tu unidad...</p>
            </div>
          ) : unitStatus === 'selection-required' ? (
            /* Fase 2 / E2 (D1): con varias unidades y sin selección válida se elige antes de operar. */
            <section aria-labelledby="unit-chooser-title" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5" data-testid="unit-chooser">
              <h2 id="unit-chooser-title" className="text-lg font-bold text-slate-800">¿Con qué unidad quieres continuar?</h2>
              <p className="text-sm text-slate-500 mt-1 mb-4">Tienes varias unidades en esta comunidad. Elige una; podrás cambiarla desde la parte superior.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {userProperties.map((p: any) => (
                  <button
                    key={p.propertyId}
                    type="button"
                    onClick={() => switchProperty(p.propertyId)}
                    className="text-left rounded-xl border border-slate-200 hover:border-(--tenant-primary) hover:bg-(--tenant-primary)/5 px-4 py-3 transition-colors"
                    data-testid="unit-chooser-option"
                  >
                    <span className="block text-sm font-bold text-slate-800">{unitLabel(p)}</span>
                    <span className="block text-xs text-slate-500">{unitRelations(p)}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : unitStatus === 'none' ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center text-slate-600" data-testid="unit-none">
              Tu cuenta no tiene ninguna unidad activa en esta comunidad. Contacta a la administración.
            </div>
          ) : unitStatus === 'error' && userProperties.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center text-slate-600" data-testid="unit-error">
              No pudimos cargar tus unidades.
              <button type="button" onClick={refreshUnits} className="ml-2 font-semibold text-(--tenant-primary) underline">Reintentar</button>
            </div>
          ) : (
            /* La clave reinicia las páginas al cambiar de unidad: ningún formulario abierto opera sobre otra unidad. */
            <Outlet key={activePropertyId ?? 'sin-unidad'} />
          )}
      </main>

      {/* Bottom Navigation (Mobile & Small Tablets only, hidden on md+) */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 flex justify-around items-center h-16 shrink-0 z-30 shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {navItems.filter(item => item.mobileVisible).map((item) => {
          const isActive = location.pathname.startsWith(item.path) && (item.path !== '/resident' || location.pathname === '/resident');
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-colors min-h-[44px]",
                isActive ? "text-(--tenant-primary)" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <div className={cn("relative p-1 rounded-lg transition-colors", isActive && "bg-(--tenant-primary)/10")}>
                {item.icon}
                {!!item.badge && (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center" data-testid={`nav-badge-mobile-${item.path}`}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold tracking-tight truncate max-w-[50px] text-center">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Citofonía Digital: Modal de llamada entrante / activa */}
      <ResidentIncomingCallModal />
    </div>
  );
};

