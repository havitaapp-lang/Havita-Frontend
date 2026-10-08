import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';
import { ShieldCheck, ShieldAlert, Package, Users, LogOut } from 'lucide-react';
import { cn } from '../utils/cn';
import { SuspendedTenantLock } from '../components/SuspendedTenantLock';

export const SecurityLayout = () => {
  const { user, logout } = useAuth();
  const { currentTenant } = useTenant();
  const { activePanicAlerts } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!user || user.role !== 'SECURITY') {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'SECURITY') return null;

  if (currentTenant?.status === 'SUSPENDED') {
    return <SuspendedTenantLock />;
  }

  const allNavItems = [
    { name: 'Dashboard', path: '/security', icon: <ShieldCheck className="w-6 h-6" /> },
    { name: 'Alertas', path: '/security/alerts', icon: <ShieldAlert className="w-6 h-6 text-red-500" />, badge: activePanicAlerts.length > 0 ? activePanicAlerts.length : undefined },
    { name: 'Visitantes', path: '/security/visitors', icon: <Users className="w-6 h-6" />, feature: 'visitors' },
    { name: 'Paquetes', path: '/security/packages', icon: <Package className="w-6 h-6" />, feature: 'packages' },
  ];

  const navItems = allNavItems.filter(
    (item) => !item.feature || !currentTenant?.activeFeatures || currentTenant.activeFeatures.includes(item.feature)
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900 text-white h-16 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded bg-(--tenant-primary) flex items-center justify-center font-bold text-xs">
            {currentTenant?.logo}
          </div>
          <div>
            <h1 className="font-bold tracking-tight leading-none text-lg">Portería Principal</h1>
            <p className="text-slate-400 text-xs mt-1">{currentTenant?.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-slate-400">Turno Activo</p>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: icon+text on md+, icon-vertical on sm, hidden on mobile */}
        <aside className="hidden sm:flex w-20 md:w-64 bg-white border-r border-slate-200 flex-col shrink-0">
          <nav className="flex-1 flex flex-col gap-2 p-3 md:p-4">
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
        </aside>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 pb-20 sm:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation (< sm) with Safe Area support */}
      <nav 
        className="sm:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white border-t border-slate-800 px-4 flex justify-around items-center h-16 shrink-0 z-30 shadow-xl"
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
      </nav>
    </div>
  );
};
