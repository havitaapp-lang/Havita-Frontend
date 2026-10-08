import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import {
  Users,
  Home,
  Package,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  Megaphone,
  Plus,
  Vote,
  ArrowRight,
  Calendar,
  ShieldAlert,
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useData } from '../../contexts/DataContext';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { pollService } from '../assemblies/services/pollService';
import { livePollService } from '../assemblies/services/livePollService';
import type { Poll } from '../assemblies/types/assembly.types';
import { shiftService, type ShiftAlert } from '../personal/services/shiftService';
import { attendanceService } from '../personal/services/attendanceService';
import type { TodayAttendanceKpis } from '../personal/types/personal.types';

export const AdminDashboard = () => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id || 'tenant-limonar';
  const { residents, properties, packages, visitors, pqrsList, communications, resolvePQRS } = useData();

  const tenantResidents = residents.filter(r => (r.tenantId || 'tenant-limonar') === tenantId);
  const tenantProperties = properties.filter(p => (p.tenantId || 'tenant-limonar') === tenantId);
  const tenantPackages = packages.filter(p => (p.tenantId || 'tenant-limonar') === tenantId);
  const tenantVisitors = visitors.filter(v => (v.tenantId || 'tenant-limonar') === tenantId);
  const tenantPQRS = pqrsList.filter(p => (p.tenantId || 'tenant-limonar') === tenantId);
  const tenantCommunications = communications.filter(c => (c.tenantId || 'tenant-limonar') === tenantId);

  const [livePoll, setLivePoll] = useState<Poll | null>(null);
  const { data: initialPoll } = useQuery({ queryKey: ['activeLivePoll'], queryFn: () => pollService.getActiveLivePoll(), retry: false });
  useEffect(() => { if (initialPoll !== undefined) setLivePoll(initialPoll || null); }, [initialPoll]);
  const [shiftAlerts, setShiftAlerts] = useState<ShiftAlert[]>([]);
  const [attendanceKpis, setAttendanceKpis] = useState<TodayAttendanceKpis>({
    totalTodayShifts: 12,
    presentCount: 10,
    pendingCount: 1,
    absentCount: 1,
  });

  const loadShiftData = () => {
    shiftService.getShiftAlerts().then(setShiftAlerts);
    attendanceService.getTodayAttendanceKpis().then(setAttendanceKpis);
  };

  useEffect(() => {
    // pollService.getActiveLivePoll().then((p) => setLivePoll(p || null));
    const unsubscribe = livePollService.subscribeToLivePoll((p) => setLivePoll(p));
    
    loadShiftData();
    window.addEventListener('havita_shifts_changed', loadShiftData);
    window.addEventListener('havita_attendance_changed', loadShiftData);

    return () => {
      unsubscribe();
      window.removeEventListener('havita_shifts_changed', loadShiftData);
      window.removeEventListener('havita_attendance_changed', loadShiftData);
    };
  }, []);

  const pendingPackages = tenantPackages.filter(p => p.status !== 'DELIVERED');
  const activeVisitors = tenantVisitors.filter(v => v.status === 'ENTERED');
  const urgentPQRS = tenantPQRS.filter(p => p.status !== 'RESOLVED');

  const activityData = [
    { name: 'Lun', paquetes: 0, visitantes: 0, pqrs: 0 },
    { name: 'Mar', paquetes: 0, visitantes: 0, pqrs: 0 },
    { name: 'Mié', paquetes: 0, visitantes: 0, pqrs: 0 },
    { name: 'Jue', paquetes: 0, visitantes: 0, pqrs: 0 },
    { name: 'Vie', paquetes: 0, visitantes: 0, pqrs: 0 },
    { name: 'Sáb', paquetes: 0, visitantes: 0, pqrs: 0 },
    { name: 'Dom', paquetes: 0, visitantes: 0, pqrs: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {currentTenant?.name || 'Limonar Parque Residencial'}
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Panel administrativo central · Operación, comunicación y seguridad en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/communications">
            <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all">
              <Plus className="w-3.5 h-3.5" /> Comunicado
            </button>
          </Link>
          <Link to="/admin/residents">
            <button className="px-4 py-2 rounded-xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all">
              <Plus className="w-3.5 h-3.5" /> Nuevo Residente
            </button>
          </Link>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Residentes Activos" 
          value={tenantResidents.length} 
          icon={<Users className="w-5 h-5 text-blue-600" />} 
          trend={`${tenantResidents.filter(r => r.status === 'ACTIVE').length} activos en la copropiedad`}
          link="/admin/residents"
        />
        <StatCard 
          title="Propiedades Registradas" 
          value={tenantProperties.length} 
          icon={<Home className="w-5 h-5 text-teal-600" />} 
          trend={`${tenantProperties.filter(p => p.status === 'OCCUPIED').length} ocupadas (${Math.round((tenantProperties.filter(p => p.status === 'OCCUPIED').length / Math.max(1, tenantProperties.length)) * 100)}% ocupación)`}
          link="/admin/properties"
        />
        <StatCard 
          title="Paquetes en Portería" 
          value={pendingPackages.length} 
          icon={<Package className="w-5 h-5 text-amber-600" />} 
          trend={`${tenantPackages.length} registrados`}
          badge={pendingPackages.length > 0 ? `${pendingPackages.length} por entregar` : 'Al día'}
          badgeColor={pendingPackages.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}
          link="/admin/packages"
        />
        <StatCard 
          title="Visitantes Adentro" 
          value={activeVisitors.length} 
          icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />} 
          trend={`${tenantVisitors.filter(v => v.status === 'ENTERED' || v.status === 'APPROVED').length} activos o autorizados`}
          link="/admin/visitors"
        />
      </div>

      {/* Tarjeta de Encuestas Activas de Asamblea */}
      {livePoll ? (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-3xl shadow-md border border-red-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white text-red-700 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                1 Encuesta en Vivo
              </span>
              <span className="text-xs text-red-100 font-semibold">{livePoll.assemblyTitle}</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white leading-tight">
              "{livePoll.question}"
            </h3>
            <p className="text-xs text-red-100 flex items-center gap-2 pt-0.5">
              <span>{livePoll.totalVotes} de {livePoll.totalEligible} residentes han votado</span>
              <span>•</span>
              <span className="font-bold text-white bg-black/20 px-2 py-0.5 rounded">
                Participación: {livePoll.participationRate}%
              </span>
            </p>
          </div>

          <Link
            to={`/admin/asambleas/${livePoll.assemblyId}`}
            className="px-4 py-2.5 bg-white hover:bg-red-50 text-red-700 font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-md transition-all whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            Ver Encuesta en Vivo
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="p-3.5 px-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5 text-slate-600">
            <Vote className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-700">No hay encuestas activas en este momento.</span>
          </div>
          <Link
            to="/admin/asambleas"
            className="font-bold text-[var(--tenant-primary)] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            Gestionar Asambleas y Votaciones →
          </Link>
        </div>
      )}

      {/* SECTION 21 & 22: CONTROL DE TURNOS Y ASISTENCIA DE HOY */}
      <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--tenant-primary)]" />
              Control de Turnos y Cobertura de Hoy
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisión de guardas en portería, cumplimiento horario y alertas de cobertura.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              to="/admin/turnos"
              className="font-bold text-[var(--tenant-primary)] hover:underline flex items-center gap-1"
            >
              Gestionar Turnos →
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              to="/admin/asistencia"
              className="font-bold text-slate-700 hover:underline flex items-center gap-1"
            >
              Ver Asistencia →
            </Link>
          </div>
        </div>

        {/* Section 21: Métricas Simples */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Turnos de Hoy
            </span>
            <span className="text-2xl font-black text-slate-900 mt-0.5 block">
              {attendanceKpis.totalTodayShifts}
            </span>
          </div>

          <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              Presentes
            </span>
            <span className="text-2xl font-black text-emerald-700 mt-0.5 block">
              {attendanceKpis.presentCount}
            </span>
          </div>

          <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/80">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
              Pendientes
            </span>
            <span className="text-2xl font-black text-amber-700 mt-0.5 block">
              {attendanceKpis.pendingCount}
            </span>
          </div>

          <div className="p-3.5 bg-rose-50/50 rounded-2xl border border-rose-200/80">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
              Ausentes
            </span>
            <span className="text-2xl font-black text-rose-700 mt-0.5 block">
              {attendanceKpis.absentCount}
            </span>
          </div>
        </div>

        {/* Section 22: Alertas Operativas para el Administrador */}
        {shiftAlerts.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
              Alertas Operativas Activas
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shiftAlerts.map((alert) => {
                const isCritical = alert.severity === 'critical';
                return (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                      isCritical
                        ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                        : 'bg-amber-50/80 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {isCritical ? (
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-black text-xs block">{alert.title}</span>
                        <p className="text-[11px] opacity-90 mt-0.5">{alert.message}</p>
                      </div>
                    </div>

                    <Link
                      to="/admin/turnos"
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] shrink-0 whitespace-nowrap shadow-2xs transition-all ${
                        isCritical
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      {alert.actionText}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Charts & Urgent Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Activity Chart (8 cols) */}
        <Card className="lg:col-span-8 border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Actividad Operativa Semanal</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Volumen de visitantes, encomiendas y PQRS ingresadas</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-[var(--tenant-primary)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--tenant-primary)]" /> Visitantes
                </span>
                <span className="flex items-center gap-1 text-amber-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Paquetes
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="colorVis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--tenant-primary)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--tenant-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPkg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                  />
                  <Area type="monotone" dataKey="visitantes" stroke="var(--tenant-primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVis)" />
                  <Area type="monotone" dataKey="paquetes" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorPkg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Attention Required Panel (4 cols) */}
        <Card className="lg:col-span-4 border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden bg-white flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Atención requerida
                </CardTitle>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700">
                  {urgentPQRS.length} pendientes
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {urgentPQRS.slice(0, 3).map((item) => (
                <div 
                  key={item.id} 
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 line-clamp-1">{item.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      item.priority === 'Crítica' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{item.propertyId} · {item.residentName}</span>
                    <button
                      onClick={() => resolvePQRS(item.id, 'Resuelto con éxito')}
                      className="text-[var(--tenant-primary)] hover:underline font-semibold text-[11px]"
                    >
                      Resolver
                    </button>
                  </div>
                </div>
              ))}

              {urgentPQRS.length === 0 && (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-medium">¡Sin incidencias pendientes!</p>
                </div>
              )}
            </CardContent>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <Link to="/admin/requests" className="text-xs font-bold text-[var(--tenant-primary)] hover:underline flex items-center justify-center gap-1">
              Ver todas las solicitudes PQRS <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Packages */}
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              Última Paquetería en Portería
            </div>
            <Link to="/admin/packages" className="text-xs font-semibold text-[var(--tenant-primary)] hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {tenantPackages.slice(0, 4).map(p => (
              <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div>
                  <div className="font-bold text-slate-800">{p.recipientName} ({p.propertyId})</div>
                  <div className="text-slate-500 text-[11px]">{p.company} · {p.receivedAt}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  p.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {p.status}
                </span>
              </div>
            ))}
            {tenantPackages.length === 0 && (
              <div className="p-4 text-center text-slate-400 text-xs">
                No hay paquetes registrados en esta copropiedad.
              </div>
            )}
          </div>
        </Card>

        {/* Latest Announcements */}
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-500" />
              Últimos Comunicados Publicados
            </div>
            <Link to="/admin/communications" className="text-xs font-semibold text-[var(--tenant-primary)] hover:underline">
              Gestionar
            </Link>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {tenantCommunications.slice(0, 4).map(c => (
              <div key={c.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="max-w-[80%]">
                  <div className="font-bold text-slate-800 truncate">{c.title}</div>
                  <div className="text-slate-500 text-[11px] truncate">{c.content}</div>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                  {c.createdAt}
                </span>
              </div>
            ))}
            {tenantCommunications.length === 0 && (
              <div className="p-4 text-center text-slate-400 text-xs">
                No hay comunicados publicados en esta copropiedad.
              </div>
            )}
          </div>
        </Card>
      </div>

    </div>
  );
};

const StatCard = ({ title, value, icon, trend, badge, badgeColor, link }: any) => (
  <Card className="border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md transition-all bg-white overflow-hidden">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500">{title}</span>
        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
        {value}
      </div>
      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-slate-500">{trend}</span>
        {badge && (
          <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      {link && (
        <Link to={link} className="mt-3 block text-[11px] font-semibold text-[var(--tenant-primary)] hover:underline pt-2 border-t border-slate-100">
          Explorar módulo →
        </Link>
      )}
    </CardContent>
  </Card>
);




