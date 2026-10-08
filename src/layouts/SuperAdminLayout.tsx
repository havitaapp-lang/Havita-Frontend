import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Building,
  Building2,
  Users,
  Flag,
  CreditCard,
  Shield,
  Settings,
  Search,
  Plus,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { GlobalSearchModal } from '../components/superAdmin/GlobalSearchModal';
import { NewTenantModal } from '../components/superAdmin/NewTenantModal';
import { ImpersonationBanner } from '../components/superAdmin/ImpersonationBanner';
import { superAdminService } from '../services/superAdminService';
import type { PlatformTenant } from '../types/superAdmin';

const NAV_GROUPS = [
  {
    title: 'CLIENTES',
    items: [
      { name: 'Comunidades', path: '/super-admin/tenants', icon: Building },
      { name: 'Organizaciones', path: '/super-admin/organizations', icon: Building2 },
      { name: 'Usuarios internos', path: '/super-admin/users', icon: Users },
      { name: 'Admins de Copropiedades', path: '/super-admin/tenant-admins', icon: Users },
    ],
  },
  {
    title: 'PRODUCTO',
    items: [
      { name: 'Features', path: '/super-admin/features', icon: Flag },
    ],
  },
  {
    title: 'SAAS',
    items: [
      { name: 'Planes', path: '/super-admin/plans', icon: Layers },
      { name: 'Suscripciones', path: '/super-admin/subscriptions', icon: CreditCard },
    ],
  },
  {
    title: 'SEGURIDAD',
    items: [
      { name: 'Audit Log', path: '/super-admin/audit', icon: Shield },
      { name: 'Configuración', path: '/super-admin/settings', icon: Settings },
    ],
  },
];

export const SuperAdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('GLOBAL');

  // Guard: Ensure user has SUPER_ADMIN role
  useEffect(() => {
    if (!user || user.role !== 'SUPER_ADMIN') {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    superAdminService.getTenants().then(setTenants);
  }, []);

  // Keyboard shortcut Cmd+K or Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!user || user.role !== 'SUPER_ADMIN') return null;

  const handleSelectTenantContext = (tenantId: string) => {
    setSelectedTenantFilter(tenantId);
    if (tenantId === 'GLOBAL') {
      navigate('/super-admin');
    } else {
      navigate(`/super-admin/tenants/${tenantId}`);
    }
  };

  const handleExitToLogin = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Impersonation Banner if active */}
      <ImpersonationBanner />

      {/* Top Bar Navigation */}
      <header className="h-14 bg-slate-900/90 border-b border-slate-800/80 px-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        {/* Left: Brand + Tenant Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div 
            onClick={() => navigate('/super-admin')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              AU
            </div>
            <div className="hidden sm:block">
              <span className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                Havita
                <span className="text-[10px] uppercase font-bold tracking-widest bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">
                  Global Backoffice
                </span>
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-800 hidden md:block" />

          {/* Tenant Switcher Dropdown */}
          <div className="relative hidden md:block">
            <select
              value={selectedTenantFilter}
              onChange={(e) => handleSelectTenantContext(e.target.value)}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer pr-8 appearance-none"
            >
              <option value="GLOBAL">🌍 Contexto Global ({tenants.length} Comunidades)</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  🏢 {t.name} ({t.city})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Center: Quick Search Trigger */}
        <div className="flex-1 max-w-md mx-4 hidden lg:block">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-400 flex items-center justify-between transition-colors group cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
              <span>Buscar comunidad, NIT, usuario o ticket...</span>
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-900 text-slate-400 rounded border border-slate-700">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Health pill + New Tenant Action + Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsWizardOpen(true)}
            className="bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl text-xs font-bold px-3 py-1.5 shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Comunidad</span>
          </button>

          <div className="h-5 w-px bg-slate-800" />

          {/* Super Admin User */}
          <div className="flex items-center gap-2 pl-1">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center border border-blue-400/40">
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'JB'}
            </div>
            <div className="hidden xl:block text-left text-xs leading-tight">
              <div className="font-bold text-slate-200">{user?.name || 'Administrador'}</div>
              <div className="text-[10px] text-slate-400 font-mono">{user?.email || 'admin@havita.com'}</div>
            </div>
            <button
              onClick={handleExitToLogin}
              title="Cerrar sesión de Backoffice"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside
          className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300 md:translate-x-0 ${
            isMobileMenuOpen ? 'fixed inset-y-14 left-0 z-40 translate-x-0' : 'hidden md:flex'
          }`}
        >
          {/* Top Brand Block */}
          <div className="p-3 pb-2 border-b border-slate-800/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">
              SUPER ADMIN
            </div>
            <NavLink
              to="/super-admin"
              end
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--tenant-primary)] text-white font-bold shadow-sm shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </NavLink>
          </div>

          <div className="p-3 overflow-y-auto flex-1 space-y-5 text-xs">
            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path || 
                      (item.path !== '/super-admin' && location.pathname.startsWith(item.path));

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all ${
                          isActive
                            ? 'bg-[var(--tenant-primary)] text-white font-bold shadow-sm shadow-blue-500/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer Info */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 text-[11px] text-slate-500 flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] text-slate-400">Havita SaaS</span>
              <div className="text-[10px]">Fase 1 · Producción</div>
            </div>
            <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
              <CheckCircle2 className="w-3 h-3" /> Activo
            </span>
          </div>
        </aside>

        {/* Workspace Canvas / Outlet */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* New Tenant Modal */}
      <NewTenantModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onTenantCreated={(newTenant) => {
          setTenants(prev => [newTenant, ...prev]);
          navigate(`/super-admin/tenants/${newTenant.id}`);
        }}
      />
    </div>
  );
};
