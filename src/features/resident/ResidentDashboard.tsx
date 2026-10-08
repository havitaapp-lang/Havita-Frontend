import SosButton from './components/SosButton';
import { useState, useEffect } from 'react';
import { Package, ShieldCheck, Wrench, QrCode, Calendar, Bell, Megaphone, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ResidentLivePollBanner } from './components/ResidentLivePollBanner';
import { ResidentLiveAttendanceBanner } from './components/ResidentLiveAttendanceBanner';
import { OnboardingModal } from './components/OnboardingModal';
import { useMyPropertyInfo } from '../../hooks/useMyPropertyInfo';

export const ResidentDashboard = () => {
  const { user, completeOnboarding } = useAuth();
  const { packages, visitors, pqrsList, communications, reservations } = useData();

  // Mostrar el modal si el onboarding no está completado
  const [showOnboarding, setShowOnboarding] = useState(
    user?.hasCompletedOnboarding === false
  );

  // Misma query que ResidentLayout (caché compartida, sin petición adicional)
  const { data: propertyInfo } = useMyPropertyInfo();

  useEffect(() => {
    // Si en memoria local no está claro si completó el onboarding, verificar con el backend
    if (user && user.hasCompletedOnboarding !== true && propertyInfo?.hasCompletedOnboarding === false) {
      setShowOnboarding(true);
    }
  }, [user, propertyInfo]);


  const handleOnboardingClose = (completed: boolean) => {
    setShowOnboarding(false);
    if (completed) completeOnboarding();
  };

  const myPropertyId = user?.propertyUnit || (visitors.length > 0 && visitors[0].propertyId) || 'Mi Apartamento';
  
  const residentPropertyId = user?.residentPropertyId;
  
  const myPackages = packages.filter(p => {
    if (residentPropertyId) return p.propertyId === residentPropertyId;
    return !user?.propertyUnit || p.propertyId === myPropertyId || p.propertyId === user?.propertyUnit;
  }).filter(p => p.status !== 'DELIVERED');

  const myVisitors = visitors.filter(v => {
    if (residentPropertyId) return v.propertyId === residentPropertyId;
    return !user?.propertyUnit || v.propertyId === myPropertyId || v.propertyId === user?.propertyUnit;
  });

  const myPQRS = pqrsList.filter(p => {
    if (residentPropertyId) return p.propertyId === residentPropertyId;
    return !user?.propertyUnit || p.propertyId === myPropertyId || p.propertyId === user?.propertyUnit;
  });

  const myReservations = reservations.filter(r => {
    if (residentPropertyId) return r.propertyId === residentPropertyId;
    return !user?.propertyUnit || r.propertyId === myPropertyId || r.propertyId === user?.propertyUnit;
  }).filter(r => r.status !== 'Cancelada');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Onboarding Modal — primer login */}
      {showOnboarding && (
        <OnboardingModal
          userName={user?.name || 'Residente'}
          onClose={handleOnboardingClose}
        />
      )}
      {/* Live Assembly Poll Banner */}
      <ResidentLiveAttendanceBanner />
      <ResidentLivePollBanner />
      
      {/* Greeting card */}
      <div className="rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-row items-center justify-between min-h-[100px]"
        style={{ backgroundColor: '#0d0b1a' }}>

        {/* Decorative elements (Matching Visual Design) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          
          {/* Base ambient illumination */}
          <div className="absolute inset-0 opacity-30" 
               style={{ background: 'linear-gradient(135deg, transparent 40%, var(--tenant-primary) 120%)' }} />

          {/* Huge Bottom-Left Swoosh */}
          <div className="absolute -bottom-[400px] -left-[200px] w-[700px] h-[700px] rounded-full border border-white/10 opacity-60"
               style={{ background: 'radial-gradient(circle at top right, var(--tenant-primary) 0%, transparent 60%)' }} />

          {/* Huge Top-Center Swoosh */}
          <div className="absolute -top-[500px] left-[100px] w-[800px] h-[800px] rounded-full border border-white/10 opacity-40"
               style={{ background: 'radial-gradient(circle at bottom, var(--tenant-primary) 0%, transparent 60%)' }} />

          {/* Massive Right Glow */}
          <div className="absolute top-0 bottom-0 right-0 w-[350px] opacity-40"
               style={{ background: 'linear-gradient(to left, var(--tenant-primary), transparent)' }} />

          {/* Dot Grid Pattern (Upper middle-right, left of separator) */}
          <svg className="absolute right-36 top-6 opacity-40" width="80" height="40" viewBox="0 0 80 40">
            {[0, 12, 24, 36].map(y => [0, 12, 24, 36, 48, 60, 72].map(x => (
              <circle key={`${x}-${y}`} cx={x+2} cy={y+2} r="1.5" fill="var(--tenant-primary)" />
            )))}
          </svg>

          {/* Small Decorative Circle (Lower middle-right, left of separator) */}
          <div className="absolute bottom-8 right-32 w-8 h-8 rounded-full opacity-40"
               style={{ background: 'var(--tenant-primary)' }} />
        </div>

        {/* Left: info */}
        <div className="relative z-10 flex-1 px-5 py-5">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-(--tenant-primary) brightness-125">
            Mi Unidad
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight leading-tight">
            {user?.name || 'Juan Sebastian'}
          </h2>
          <p className="text-xs text-slate-300/80 mt-0.5 font-medium">{myPropertyId}</p>

          <div className="flex items-center gap-2 mt-3 w-fit px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{ background: 'rgba(6, 78, 59, 0.6)', color: '#34d399', backdropFilter: 'blur(8px)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Conectado
          </div>
        </div>

        {/* Separator */}
        <div className="relative z-10 w-px self-stretch my-4" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.15), transparent)' }} />

        {/* Right: QR */}
        <div className="relative z-10 flex flex-col items-center justify-center px-5 py-5 cursor-pointer group shrink-0">
          <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center p-2.5 transition-all duration-300 group-hover:scale-105"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
            {/* Soft halo behind QR */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-300 blur-md" style={{ background: 'var(--tenant-primary)' }} />
            <QrCode className="relative z-10 w-full h-full text-white" />
          </div>
          <div className="flex items-center gap-0.5 mt-2 text-[10px] text-slate-300 font-semibold group-hover:text-white transition-colors whitespace-nowrap">
            Mostrar código QR <span className="ml-0.5 text-[9px]">&gt;</span>
          </div>
        </div>
      </div>

      {/* Resumen Header */}
      <div className="flex items-center justify-between mb-3 mt-8">
        <h3 className="text-sm font-bold text-slate-500 tracking-wider">RESUMEN</h3>
        <span className="text-xs text-slate-500 font-medium">Hoy, {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>

      {/* 4 Colored Metric Status Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* Paquetes */}
        <Link to="/resident/packages" className="bg-emerald-50/50 border border-emerald-100 rounded-[20px] p-3 flex items-center justify-between hover:bg-emerald-50 transition-colors">
          <div className="flex items-center min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mr-2 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0 pr-1">
              <div className="text-xl font-black text-slate-800 leading-none mb-0.5">
                {myPackages.length}
              </div>
              <div className="text-[10px] font-bold text-emerald-950 leading-tight truncate">Paquetes pendientes</div>
              <div className="text-[9px] text-slate-500 mt-0.5 truncate">En portería</div>
            </div>
          </div>
          <span className="text-slate-400 text-xs shrink-0">&gt;</span>
        </Link>

        {/* Visitantes */}
        <Link to="/resident/visitors" className="bg-amber-50/50 border border-amber-100 rounded-[20px] p-3 flex items-center justify-between hover:bg-amber-50 transition-colors">
          <div className="flex items-center min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mr-2 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 pr-1">
              <div className="text-xl font-black text-slate-800 leading-none mb-0.5">
                {myVisitors.filter(v => v.status === 'APPROVED').length}
              </div>
              <div className="text-[10px] font-bold text-amber-950 leading-tight truncate">Visitas autorizadas</div>
              <div className="text-[9px] text-slate-500 mt-0.5 truncate">En el día</div>
            </div>
          </div>
          <span className="text-slate-400 text-xs shrink-0">&gt;</span>
        </Link>

        {/* PQRS */}
        <Link to="/resident/requests" className="bg-rose-50/50 border border-rose-100 rounded-[20px] p-3 flex items-center justify-between hover:bg-rose-50 transition-colors">
          <div className="flex items-center min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mr-2 shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0 pr-1">
              <div className="text-xl font-black text-slate-800 leading-none mb-0.5">
                {myPQRS.filter(p => p.status !== 'RESOLVED').length}
              </div>
              <div className="text-[10px] font-bold text-rose-950 leading-tight truncate">PQRS en proceso</div>
              <div className="text-[9px] text-slate-500 mt-0.5 truncate">Mis solicitudes</div>
            </div>
          </div>
          <span className="text-slate-400 text-xs shrink-0">&gt;</span>
        </Link>

        {/* Reservas */}
        <Link to="/resident/reservations" className="bg-purple-50/50 border border-purple-100 rounded-[20px] p-3 flex items-center justify-between hover:bg-purple-50 transition-colors">
          <div className="flex items-center min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mr-2 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0 pr-1">
              <div className="text-xl font-black text-slate-800 leading-none mb-0.5">
                {myReservations.length}
              </div>
              <div className="text-[10px] font-bold text-purple-950 leading-tight truncate">Reservas activas</div>
              <div className="text-[9px] text-slate-500 mt-0.5 truncate">De zonas comunes</div>
            </div>
          </div>
          <span className="text-slate-400 text-xs shrink-0">&gt;</span>
        </Link>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="mt-8">
        <h3 className="text-sm font-bold text-slate-500 tracking-wider mb-3">ACCIONES RÁPIDAS</h3>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <Link to="/resident/visitors" className="p-3 sm:p-4 bg-white rounded-[20px] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow h-[110px] sm:h-[130px] group relative">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex items-end justify-between mt-2">
              <div className="text-[10px] sm:text-[13px] font-bold text-slate-800 leading-tight">Autorizar<br/>visita</div>
              <span className="text-slate-300 group-hover:text-emerald-500 transition-colors text-[10px] sm:text-xs mb-0.5">&gt;</span>
            </div>
          </Link>

          <Link to="/resident/requests" className="p-3 sm:p-4 bg-white rounded-[20px] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow h-[110px] sm:h-[130px] group relative">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex items-end justify-between mt-2">
              <div className="text-[10px] sm:text-[13px] font-bold text-slate-800 leading-tight">Reportar<br/>daño</div>
              <span className="text-slate-300 group-hover:text-rose-500 transition-colors text-[10px] sm:text-xs mb-0.5">&gt;</span>
            </div>
          </Link>

          <Link to="/resident/reservations" className="p-3 sm:p-4 bg-white rounded-[20px] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow h-[110px] sm:h-[130px] group relative">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex items-end justify-between mt-2">
              <div className="text-[10px] sm:text-[13px] font-bold text-slate-800 leading-tight">Reservar<br/>zona</div>
              <span className="text-slate-300 group-hover:text-indigo-500 transition-colors text-[10px] sm:text-xs mb-0.5">&gt;</span>
            </div>
          </Link>

          <Link to="/resident/packages" className="p-3 sm:p-4 bg-white rounded-[20px] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow h-[110px] sm:h-[130px] group relative">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex items-end justify-between mt-2">
              <div className="text-[10px] sm:text-[13px] font-bold text-slate-800 leading-tight">Ver<br/>paquetes</div>
              <span className="text-slate-300 group-hover:text-orange-500 transition-colors text-[10px] sm:text-xs mb-0.5">&gt;</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Announcements */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">ÚLTIMOS COMUNICADOS</h3>
          <Link to="/resident/community" className="text-sm text-[var(--tenant-primary)] font-bold hover:underline flex items-center gap-1">
            Ver todos <span>&gt;</span>
          </Link>
        </div>

        <div className="space-y-3">
          {communications.slice(0, 2).map((comm, index) => (
            <Link to="/resident/community" key={comm.id} className="p-4 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow group relative">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${index === 0 ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                {index === 0 ? <Megaphone className="w-6 h-6" /> : <Info className="w-6 h-6" />}
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${index === 0 ? 'text-purple-600' : 'text-blue-600'}`}>{comm.category || 'General'}</span>
                  <span className="text-xs text-slate-400 absolute right-4 top-4">{comm.createdAt}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-snug mt-0.5">{comm.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{comm.content}</p>
              </div>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-[var(--tenant-primary)] transition-colors">&gt;</span>
            </Link>
          ))}
        </div>
      </div>

      <SosButton />
    </div>
  );
};

