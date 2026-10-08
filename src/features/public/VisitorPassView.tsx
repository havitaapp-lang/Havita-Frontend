import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Car, Clock, Building, User, ShieldCheck, Copy, Check, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useData } from '../../contexts/DataContext';
import { maskDocument } from '../../utils/sanitizers';
import { notificationService } from '../../services/notificationService';
import { visitorService } from '../../services/visitorService';
import type { Visitor } from '../../types';

export const VisitorPassView = () => {
  const { token } = useParams<{ token: string }>();
  const { visitors } = useData();
  const [copied, setCopied] = useState(false);
  const [fetchedVisitors, setFetchedVisitors] = useState<Visitor[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch from backend API /public/visitor-passes/:token
  useEffect(() => {
    let isMounted = true;
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    visitorService.getPublicPass(token)
      .then(passes => {
        if (isMounted) {
          setFetchedVisitors(passes.length > 0 ? passes : null);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.warn("Public pass API error, falling back to local context:", err);
        if (isMounted) {
          setFetchedVisitors(null);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Find visitors that match this QR code or id or groupId (priority: backend fetch, then local context fallback)
  const passVisitors = useMemo(() => {
    if (fetchedVisitors && fetchedVisitors.length > 0) {
      return fetchedVisitors;
    }
    if (!token) return [];
    return visitors.filter(
      v => v.qrCode === token || v.id === token || v.groupId === token
    );
  }, [fetchedVisitors, visitors, token]);

  const first = passVisitors[0];
  const isGroup = passVisitors.length > 1;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    notificationService.showToast('Enlace copiado al portapapeles', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--tenant-primary)]" />
          <p className="text-sm font-semibold">Cargando pase de acceso...</p>
        </div>
      </div>
    );
  }

  if (!first) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Pase no encontrado</h2>
          <p className="text-sm text-slate-500">
            No encontramos un pase activo asociado al código <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{token}</span>.
          </p>
          <Link
            to="/resident/visitors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--tenant-primary)] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a mis visitas
          </Link>
        </div>
      </div>
    );
  }

  const isCancelled = passVisitors.every(v => v.status === 'CANCELLED');
  const allExited = passVisitors.every(v => v.status === 'EXITED');
  const allEntered = passVisitors.every(v => v.status === 'ENTERED' || v.status === 'EXITED');

  // Cálculo en tiempo real de expiración y visita futura
  const now = new Date();
  const rawExpectedAt = first?.expectedAt;
  let isExpiredByTime = false;
  let isFutureDate = false;
  let futureDateLabel = '';

  if (rawExpectedAt) {
    const parsedDate = new Date(rawExpectedAt);
    if (!isNaN(parsedDate.getTime())) {
      const expirationMoment = new Date(parsedDate.getTime() + 12 * 60 * 60 * 1000);
      isExpiredByTime = now > expirationMoment;
      
      const todayStr = new Date().toDateString();
      const visitDateStr = parsedDate.toDateString();
      if (visitDateStr !== todayStr && parsedDate > now) {
        isFutureDate = true;
        futureDateLabel = parsedDate.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
      }
    }
  }

  const isExpired = passVisitors.every(v => v.status === 'EXPIRED') || isExpiredByTime;
  const isFuture = !isCancelled && !isExpired && !allEntered && isFutureDate;

  let badgeProps = { label: 'Válido para ingreso', colorClass: 'bg-blue-50 text-blue-700 border-blue-200', dotClass: 'bg-blue-500' };
  if (isCancelled) badgeProps = { label: 'Cancelado', colorClass: 'bg-red-50 text-red-700 border-red-200', dotClass: 'bg-red-500' };
  else if (isExpired) badgeProps = { label: 'Pase Expirado', colorClass: 'bg-slate-100 text-slate-700 border-slate-200', dotClass: 'bg-slate-500' };
  else if (isFuture) badgeProps = { label: `Programado: ${futureDateLabel || 'Fecha futura'}`, colorClass: 'bg-purple-50 text-purple-700 border-purple-200', dotClass: 'bg-purple-500' };
  else if (allExited) badgeProps = { label: 'Finalizado', colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotClass: 'bg-emerald-500' };
  else if (allEntered) badgeProps = { label: 'En curso', colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotClass: 'bg-emerald-500' };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-5 p-6 text-center">
        {/* Header Badge */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-[var(--tenant-primary)] bg-blue-50 px-3 py-1 rounded-full">
            {isGroup ? `Pase Grupal - ${passVisitors.length} Personas` : 'Pase de Acceso'}
          </span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeProps.colorClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badgeProps.dotClass}`} />
            {badgeProps.label}
          </span>
        </div>

        {/* Community & Destination */}
        <div>
          <h1 className="text-xl font-black text-slate-900 leading-tight">
            {first.visitPurpose || (isGroup ? 'Pase de Visita Grupal' : first.name)}
          </h1>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-1">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span>Unidad: <strong className="text-slate-800 font-bold">{first.propertyName || first.propertyNumber || first.propertyId}</strong></span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{first.expectedAt || 'Hoy'}</span>
          </div>
        </div>

        {/* QR Visual */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
          <div className="w-44 h-44 bg-white p-2.5 border border-slate-200 rounded-2xl flex items-center justify-center relative overflow-hidden">
            <QRCodeSVG 
              value={first.qrCode || token || ''} 
              size={150} 
              level="H"
              className="w-full h-full opacity-90"
              bgColor="#ffffff"
              fgColor="#0f172a" 
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-[var(--tenant-primary)] text-white p-3 rounded-2xl shadow-lg flex items-center justify-center">
                <ShieldCheck className="w-7 h-7" />
              </div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-500 uppercase mt-2 font-bold tracking-wider">
            {first.qrCode || token}
          </div>
        </div>

        {/* Authorized people list */}
        <div className="text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Personas autorizadas:
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {passVisitors.map(v => (
              <div key={v.id} className="flex items-center justify-between p-1.5 bg-white rounded-xl border border-slate-100">
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                    {v.name}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    DOC {}
                    {v.vehiclePlate && (
                      <span className="ml-1.5 font-mono text-[9px] bg-amber-50 text-amber-800 px-1 rounded border border-amber-200 inline-flex items-center gap-0.5">
                        <Car className="w-2.5 h-2.5" /> {v.vehiclePlate}
                      </span>
                    )}
                  </div>
                </div>
                {v.status === 'ENTERED' ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Adentro
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                    Autorizado
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {first.observations && (
          <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            "{first.observations}"
          </p>
        )}

        {/* Copy / Action */}
        <button
          onClick={handleCopyLink}
          className="w-full bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-2xl text-xs font-bold py-3 shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Enlace Copiado' : 'Copiar Enlace de Acceso'}
        </button>

        <p className="text-[11px] text-slate-400">
          Presenta este código QR en la portería de la unidad residencial para validar tu ingreso.
        </p>
      </div>
    </div>
  );
};
