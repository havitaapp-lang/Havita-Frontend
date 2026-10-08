import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, Users, Home, Package, ShieldCheck, Wrench, 
  Calendar, FileText, Bell, Settings, LogOut, Menu, X,
  UserCheck, Vote, CalendarDays, ClipboardList, ShoppingBag
} from 'lucide-react';
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

  // If not authenticated or neither admin nor super_admin, redirect to login
  React.useEffect(() => {
    if (!user || (user.role !== 'COMMUNITY_ADMIN' && user.role !== 'SUPER_ADMIN')) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user || (user.role !== 'COMMUNITY_ADMIN' && user.role !== 'SUPER_ADMIN')) return null;

  if (currentTenant?.status === 'SUSPENDED' && user.role !== 'SUPER_ADMIN') {
    return <SuspendedTenantLock />;
  }

  const allNavItems = [
    { name: 'Dashboard', path: '/admin', icon: <Building2 className="w-5 h-5" /> },
    { name: 'Residentes', path: '/admin/residents', icon: <Users className="w-5 h-5" /> },
    { name: 'Propiedades', path: '/admin/properties', icon: <Home className="w-5 h-5" /> },
    { name: 'Personal', path: '/admin/personal', icon: <UserCheck className="w-5 h-5" />, feature: 'staff' },
    { name: 'Turnos', path: '/admin/turnos', icon: <CalendarDays className="w-5 h-5" />, feature: 'staff' },
    { name: 'Asistencia', path: '/admin/asistencia', icon: <ClipboardList className="w-5 h-5" />, feature: 'staff' },
    { name: 'Asambleas', path: '/admin/asambleas', icon: <Vote className="w-5 h-5" />, feature: 'surveys' },
    { name: 'Marketplace', path: '/admin/marketplace', icon: <ShoppingBag className="w-5 h-5" />, feature: 'marketplace' },
    { name: 'Comunicados', path: '/admin/communications', icon: <Bell className="w-5 h-5" /> },
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

        <div className="p-4 border-t border-slate-800">
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
            <div className="flex items-center gap-2">
              <img src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} alt="Avatar" className="w-8 h-8 rounded-full bg-slate-200" />
              <div className="hidden md:block text-sm">
                <p className="font-medium text-slate-700 leading-none">{user?.name || 'Super Admin (Modo Soporte)'}</p>
                <p className="text-slate-500 text-xs mt-1">Administrador</p>
              </div>
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
