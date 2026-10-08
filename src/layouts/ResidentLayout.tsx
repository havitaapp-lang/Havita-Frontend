import { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';
import { useMyPropertyInfo } from '../hooks/useMyPropertyInfo';
import { Home, ShieldCheck, Wrench, Package, Calendar, Bell, LogOut, Sofa, ChevronDown, Building2, UserCircle, ShoppingBag } from 'lucide-react';
import { useState, useRef } from 'react';
import { cn } from '../utils/cn';
import { SuspendedTenantLock } from '../components/SuspendedTenantLock';

export const ResidentLayout = () => {
  const { user, logout, updateUser, userProperties, activePropertyId, switchProperty, isSwitchingProperty } = useAuth() as any;
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
      navigate('/login');
    }
  }, [user, navigate]);

  // Si el usuario no tiene su unidad cargada o tiene el valor por defecto, consultamos al backend
  // (query compartida con ResidentDashboard: una sola petición por usuario)
  const { data: propertyInfo, error: propertyInfoError } = useMyPropertyInfo();

  useEffect(() => {
    const info = propertyInfo;
    if (!user || user.role !== 'RESIDENT' || !info) return;
    if (info.number || info.name) {
      const unitDisplay = info.number || info.name;
      if (user.propertyUnit !== unitDisplay) {
        updateUser({
          propertyUnit: unitDisplay,
          residentPropertyId: info.propertyId,
          hasCompletedOnboarding: info.hasCompletedOnboarding ?? user.hasCompletedOnboarding,
        });
      }
    }
  }, [propertyInfo, user?.id]);

  useEffect(() => {
    if (!propertyInfoError) return;
    console.warn('No se pudo cargar información de la propiedad (posible revocación):', propertyInfoError);
    logout();
    navigate('/login', {
      replace: true,
      state: { reason: 'access_revoked' },
    });
  }, [propertyInfoError]);


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

  if (!user || user.role !== 'RESIDENT') return null;

  if (currentTenant?.status === 'SUSPENDED') {
    return <SuspendedTenantLock />;
  }

  const allNavItems = [
    { name: 'Inicio', path: '/resident', icon: <Home className="w-5 h-5" />, mobileVisible: true },
    { name: 'Visitas', path: '/resident/visitors', icon: <ShieldCheck className="w-5 h-5" />, mobileVisible: true },
    { name: 'Paquetes', path: '/resident/packages', icon: <Package className="w-5 h-5" />, mobileVisible: false },
    { name: 'PQRS', path: '/resident/requests', icon: <Wrench className="w-5 h-5" />, mobileVisible: true },
    { name: 'Reservas', path: '/resident/reservations', icon: <Calendar className="w-5 h-5" />, mobileVisible: false },
    { name: 'Marketplace', path: '/resident/marketplace', icon: <ShoppingBag className="w-5 h-5" />, mobileVisible: true },
    { name: 'Hogar', path: '/resident/my-home', icon: <Sofa className="w-5 h-5" />, mobileVisible: true },
  ];

  const navItems = allNavItems;

  
  

  const handleSwitchProperty = (prop: any) => {
    switchProperty(prop.propertyId);
    updateUser({
      propertyUnit: prop.path || prop.propertyName || prop.number || prop.name || 'Apartamento',
      residentPropertyId: prop.propertyId
    });
    setIsDropdownOpen(false);
  };
  const displayUnit = user?.propertyUnit || 'Mi Apartamento';

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
                          {p.path || p.propertyName || p.number || p.name || 'Apartamento'}
                        </span>
                        <span className="text-xs text-slate-500">{p.type} {p.isMainContact ? '(Principal)' : ''}</span>
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
                  </Link>
                );
              })}
            </div>

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
        {isSwitchingProperty ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-(--tenant-primary) rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium animate-pulse">Cargando informaci&oacute;n del apartamento...</p>
            </div>
          ) : (
            <Outlet />
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
              <div className={cn("p-1 rounded-lg transition-colors", isActive && "bg-(--tenant-primary)/10")}>
                {item.icon}
              </div>
              <span className="text-[10px] font-semibold tracking-tight truncate max-w-[50px] text-center">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

