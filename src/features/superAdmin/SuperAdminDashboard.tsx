import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  Building2,
  CreditCard,
  AlertTriangle,
  ShieldAlert,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import { NewTenantModal } from '../../components/superAdmin/NewTenantModal';
import type { AuditEvent, PlatformTenant } from '../../types/superAdmin';

export const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isNewTenantOpen, setIsNewTenantOpen] = useState(false);
  const [tenantsList, setTenantsList] = useState<PlatformTenant[]>([]);
  const [kpis, setKpis] = useState({
    activeTenants: 0,
    organizations: 0,
    activeSubscriptions: 0,
    expiringSubscriptions: 0,
    suspendedTenants: 0,
  });

  useEffect(() => {
    superAdminService.getAuditLog().then(events => setAuditEvents(events.slice(0, 6)));
    superAdminService.getOverview().then(ov => {
      setKpis({
        activeTenants: ov.activeTenants,
        organizations: ov.organizations,
        activeSubscriptions: ov.activeTenants,
        expiringSubscriptions: 0,
        suspendedTenants: ov.suspendedTenants,
      });
    });
    superAdminService.getTenants().then(tList => setTenantsList(tList));
  }, []);

  const totalTenantsCount = tenantsList.length || 1;
  const activeCount = tenantsList.filter(t => t.status === 'ACTIVE').length;
  const trialCount = tenantsList.filter(t => t.status === 'TRIAL').length;
  const suspendedCount = tenantsList.filter(t => t.status === 'SUSPENDED').length;
  const pastDueCount = tenantsList.filter(t => t.status === 'PAST_DUE').length;

  const starterCount = tenantsList.filter(t => (t.planName || '').toLowerCase().includes('starter') || t.planId === 'starter' || t.planId === 'plan-starter').length;
  const proCount = tenantsList.filter(t => (t.planName || '').toLowerCase().includes('pro') || t.planId === 'plan-pro').length;
  const enterpriseCount = tenantsList.filter(t => (t.planName || '').toLowerCase().includes('enterprise') || t.planId === 'plan-enterprise').length;

  const monthlyGrowth = [
    { month: 'May', count: Math.max(0, tenantsList.length - 2), height: '50%' },
    { month: 'Jun', count: Math.max(0, tenantsList.length - 1), height: '65%' },
    { month: 'Jul', count: tenantsList.length, height: '80%' },
    { month: 'Ago', count: tenantsList.length, height: '90%' },
    { month: 'Sep', count: tenantsList.length, height: '100%' },
  ];

  const statusDistribution = [
    { label: 'Activas (Al día)', count: activeCount, percentage: Math.round((activeCount / totalTenantsCount) * 100), color: 'bg-emerald-500' },
    { label: 'En Prueba (Trial)', count: trialCount, percentage: Math.round((trialCount / totalTenantsCount) * 100), color: 'bg-blue-500' },
    { label: 'En Mora / Por Vencer', count: pastDueCount, percentage: Math.round((pastDueCount / totalTenantsCount) * 100), color: 'bg-amber-500' },
    { label: 'Suspendidas', count: suspendedCount, percentage: Math.round((suspendedCount / totalTenantsCount) * 100), color: 'bg-rose-500' },
  ];

  const planDistribution = [
    { name: 'Professional', tenants: proCount, percentage: Math.round((proCount / totalTenantsCount) * 100), color: 'bg-blue-500', price: '$1.000 COP/ud' },
    { name: 'Starter', tenants: starterCount, percentage: Math.round((starterCount / totalTenantsCount) * 100), color: 'bg-indigo-500', price: '$800 COP/ud' },
    { name: 'Enterprise', tenants: enterpriseCount, percentage: Math.round((enterpriseCount / totalTenantsCount) * 100), color: 'bg-purple-500', price: '$1.200 COP/ud' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Dashboard Global
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Estado comercial y operativo de Havita a nivel de plataforma.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/super-admin/tenants')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Ver Comunidades
          </button>
          <button
            onClick={() => setIsNewTenantOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva Comunidad
          </button>
        </div>
      </div>

      {/* 1. KPIs ESENCIALES DE FASE 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Comunidades Activas */}
        <div 
          onClick={() => navigate('/super-admin/tenants')}
          className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1.5 hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Comunidades Activas</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
              <Building className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {kpis.activeTenants}
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +8 este mes
          </div>
        </div>

        {/* Organizaciones */}
        <div 
          onClick={() => navigate('/super-admin/organizations')}
          className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1.5 hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Organizaciones</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {kpis.organizations}
          </div>
          <div className="text-[11px] text-slate-400">
            Firmas inmobiliarias
          </div>
        </div>

        {/* Suscripciones Activas */}
        <div 
          onClick={() => navigate('/super-admin/subscriptions')}
          className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1.5 hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Suscripciones Activas</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-105 transition-transform">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {kpis.activeSubscriptions}
          </div>
          <div className="text-[11px] text-blue-400 font-medium">
            Facturación mensual / anual
          </div>
        </div>

        {/* Suscripciones Próximas a Vencer */}
        <div 
          onClick={() => navigate('/super-admin/subscriptions')}
          className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1.5 hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Por Vencer</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
            {kpis.expiringSubscriptions}
          </div>
          <div className="text-[11px] text-slate-400">
            En los próximos 7 días
          </div>
        </div>

        {/* Comunidades Suspendidas (Opcional) */}
        <div 
          onClick={() => navigate('/super-admin/tenants')}
          className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1.5 hover:border-slate-700 transition-colors cursor-pointer group col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Suspendidas</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
            {kpis.suspendedTenants}
          </div>
          <div className="text-[11px] text-slate-400">
            Acceso bloqueado
          </div>
        </div>
      </div>

      {/* 2. GRÁFICOS (3 MÁXIMO) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico 1: Crecimiento de Comunidades */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Crecimiento de Comunidades</span>
              <span className="text-[11px] text-emerald-400 font-semibold font-mono">+77% en 6m</span>
            </h2>
            <p className="text-[11px] text-slate-400">Evolución mensual de comunidades registradas</p>
          </div>

          <div className="h-40 flex items-end justify-between gap-2 pt-6 px-1">
            {monthlyGrowth.map((item) => (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] font-mono text-slate-400 group-hover:text-white transition-colors">
                  {item.count}
                </span>
                <div
                  className="w-full bg-blue-600/30 group-hover:bg-blue-600 border border-blue-500/40 rounded-t-lg transition-all"
                  style={{ height: item.height }}
                />
                <span className="text-[11px] text-slate-400 font-medium">
                  {item.month}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico 2: Comunidades por Estado */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white">Comunidades por Estado</h2>
            <p className="text-[11px] text-slate-400">Distribución de los {tenantsList.length} tenants registrados</p>
          </div>

          <div className="space-y-3 pt-1">
            {statusDistribution.map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{s.label}</span>
                  <span className="font-mono text-white font-bold">{s.count} ({s.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className={`${s.color} h-2 rounded-full`} style={{ width: `${s.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico 3: Distribución por Plan */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white">Distribución por Plan</h2>
            <p className="text-[11px] text-slate-400">Participación por nivel de suscripción SaaS</p>
          </div>

          <div className="space-y-3 pt-1">
            {planDistribution.map((p) => (
              <div key={p.name} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{p.name}</span>
                  <span className="font-mono text-slate-300">{p.tenants} tenants ({p.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div className={`${p.color} h-1.5 rounded-full`} style={{ width: `${p.percentage}%` }} />
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{p.price}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. ACTIVIDAD RECIENTE */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Actividad Reciente en la Plataforma
            </h2>
            <p className="text-xs text-slate-400">
              Registro de eventos clave: altas, cambios de planes, suspensiones y usuarios internos.
            </p>
          </div>

          <button
            onClick={() => navigate('/super-admin/audit')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
          >
            Ver Audit Log Completo →
          </button>
        </div>

        <div className="divide-y divide-slate-800/70">
          {auditEvents.map((event) => (
            <div key={event.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-800/30 px-2 rounded-xl transition-colors">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-400 shrink-0 mt-0.5 sm:mt-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">{event.action}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {event.resource}
                    </span>
                    {event.tenantName && (
                      <span className="text-slate-400 truncate">• {event.tenantName}</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5 truncate max-w-xl">{event.details}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-slate-500 text-[11px] pl-9 sm:pl-0">
                <span>{event.actorName}</span>
                <span>•</span>
                <span className="font-mono">{event.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal para crear comunidad */}
      <NewTenantModal
        isOpen={isNewTenantOpen}
        onClose={() => setIsNewTenantOpen(false)}
        onTenantCreated={(newTenant) => {
          navigate(`/super-admin/tenants/${newTenant.id}`);
        }}
      />
    </div>
  );
};
