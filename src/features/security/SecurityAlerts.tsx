import React, { useEffect, useRef, useState } from 'react';
import {
  Bell, Clock, Loader2, ShieldAlert
} from 'lucide-react';
import { panicService } from '../../services/panicService';
import type { PanicAlert } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const ALERT_ICONS: Record<string, string> = {
  MEDICAL: '🚑',
  SECURITY: '🛡️',
  FIRE: '🔥',
  OTHER: '⚠️',
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: '🔴 Activa', color: 'bg-red-100 text-red-700 border border-red-200' },
  ACKNOWLEDGED: { label: '🟠 En atención', color: 'bg-amber-100 text-amber-700 border border-amber-200' },
  RESOLVED: { label: '🟢 Resuelta', color: 'bg-green-100 text-green-700 border border-green-200' },
  FALSE_ALARM: { label: '⚪ Falsa alarma', color: 'bg-gray-100 text-gray-600 border border-gray-200' },
};

type Tab = 'active' | 'history';

export default function SecurityAlerts() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('active');
  const [activeAlerts, setActiveAlerts] = useState<PanicAlert[]>([]);
  const [historyAlerts, setHistoryAlerts] = useState<PanicAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resolveModal, setResolveModal] = useState<{ id: string; notes: string } | null>(null);
  
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };
    window.addEventListener('click', initAudio, { once: true });
    return () => window.removeEventListener('click', initAudio);
  }, []);

  const playAlertSound = () => {
    try {
      let ctx = audioCtxRef.current;
      if (!ctx) {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = ctx;
      }
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.30);
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.45);
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn('No se pudo reproducir sonido de alerta:', e);
    }
  };

  const isMineOrActive = (alert: PanicAlert) => {
    if (alert.status === 'ACTIVE') return true;
    if (alert.status === 'ACKNOWLEDGED') {
      const myId = user?.id?.toLowerCase().trim();
      const ackId = alert.acknowledgedById?.toLowerCase().trim();
      return myId === ackId;
    }
    return false;
  };

  const loadActive = async () => {
    setLoading(true);
    try {
      const data = await panicService.getActiveAlerts();
      setActiveAlerts(data.filter(isMineOrActive));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await panicService.getAllAlerts(0, 50);
      setHistoryAlerts(res.content.filter(a => !isMineOrActive(a)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'active') loadActive();
    else loadHistory();
  }, [tab]);

  useEffect(() => {
    const handleNewAlert = (e: Event) => {
      const alert = (e as CustomEvent).detail?.alert as PanicAlert;
      if (!alert) return;
      
      playAlertSound();
      
      if (isMineOrActive(alert)) {
        setActiveAlerts(prev => {
          if (prev.some(a => a.id === alert.id)) return prev;
          return [alert, ...prev];
        });
      } else {
        setHistoryAlerts(prev => {
          if (prev.some(a => a.id === alert.id)) return prev;
          return [alert, ...prev];
        });
      }
    };
    
    const handleUpdatedAlert = (e: Event) => {
      const alert = (e as CustomEvent).detail?.alert as PanicAlert;
      if (!alert) return;
      
      if (isMineOrActive(alert)) {
        setActiveAlerts(prev => prev.some(a => a.id === alert.id) ? prev.map(a => a.id === alert.id ? alert : a) : [alert, ...prev]);
        setHistoryAlerts(prev => prev.filter(a => a.id !== alert.id));
      } else {
        setActiveAlerts(prev => prev.filter(a => a.id !== alert.id));
        setHistoryAlerts(prev => {
          if (prev.some(a => a.id === alert.id)) return prev.map(a => a.id === alert.id ? alert : a);
          return [alert, ...prev];
        });
      }
    };
    
    window.addEventListener('PANIC_ALERT', handleNewAlert);
    window.addEventListener('PANIC_ALERT_UPDATED', handleUpdatedAlert);
    return () => {
      window.removeEventListener('PANIC_ALERT', handleNewAlert);
      window.removeEventListener('PANIC_ALERT_UPDATED', handleUpdatedAlert);
    };
  }, [user]);

  const handleAcknowledge = async (id: string) => {
    setActionLoading(id + '_ack');
    try {
      const updated = await panicService.acknowledgeAlert(id);
      setActiveAlerts(prev => prev.map(a => a.id === updated.id ? updated : a));
    } catch (e) { console.error(e); } 
    finally { setActionLoading(null); }
  };

  const handleResolve = async (finalStatus: 'RESOLVED' | 'FALSE_ALARM') => {
    if (!resolveModal) return;
    setActionLoading(resolveModal.id + '_res');
    try {
      const updated = await panicService.resolveAlert(resolveModal.id, finalStatus, resolveModal.notes || undefined);
      setActiveAlerts(prev => prev.filter(a => a.id !== updated.id));
      setHistoryAlerts(prev => {
        if (prev.some(a => a.id === updated.id)) return prev.map(a => a.id === updated.id ? updated : a);
        return [updated, ...prev];
      });
      setResolveModal(null);
    } catch (e) { console.error(e); } 
    finally { setActionLoading(null); }
  };

  const displayAlerts = tab === 'active' ? activeAlerts : historyAlerts;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 mb-20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="h-7 w-7 text-red-600" />
        <h1 className="text-2xl font-bold text-gray-900">Alertas de Emergencia</h1>
        {activeAlerts.length > 0 && (
          <span className="ml-auto bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-md shadow-red-600/30">
            {activeAlerts.length} activa{activeAlerts.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100/80 rounded-xl p-1 mb-6 border border-gray-200">
        <button
          onClick={() => setTab('active')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
            tab === 'active' ? 'bg-white text-red-700 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Activas {activeAlerts.length > 0 && `(${activeAlerts.length})`}
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
            tab === 'history' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Historial reciente
        </button>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-red-500 mb-2" />
          <p className="text-gray-500 font-medium">Cargando alertas...</p>
        </div>
      ) : displayAlerts.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">
            {tab === 'active' ? 'El conjunto está tranquilo. No hay alertas activas.' : 'No hay alertas en el historial.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayAlerts.map(alert => {
            const badge = STATUS_BADGE[alert.status] ?? STATUS_BADGE.ACTIVE;
            const isAckLoading = actionLoading === alert.id + '_ack';
            const isActive = alert.status === 'ACTIVE';

            return (
              <div
                key={alert.id}
                className={`bg-white rounded-2xl p-5 shadow-sm transition-all ${
                  isActive ? 'border-2 border-red-400 ring-4 ring-red-50' : 'border border-gray-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-2xl ${isActive ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <span className="text-3xl block transform group-hover:scale-110 transition-transform">
                        {ALERT_ICONS[alert.alertType] ?? '⚠️'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{alert.alertTypeLabel}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                      
                      {alert.residentName && (
                        <p className="text-gray-700 font-medium flex items-center gap-1.5 mt-2">
                          <span className="text-gray-400">👤</span> {alert.residentName}
                        </p>
                      )}
                      {alert.propertyPath && (
                        <p className="text-gray-700 font-medium flex items-center gap-1.5 mt-1">
                          <span className="text-gray-400">🏠</span> {alert.propertyPath}
                        </p>
                      )}
                      {alert.notes && (
                        <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3">
                          <p className="text-sm text-amber-900 italic">"{alert.notes}"</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1 min-w-[140px] pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{new Date(alert.createdAt).toLocaleString('es-CO')}</span>
                    </div>
                    {alert.acknowledgedByName && (
                      <p className="text-[11px] text-amber-700 font-medium mt-1.5 bg-amber-50 px-2 py-1 rounded-md">
                        ✔️ Tomada por {alert.acknowledgedByName}
                      </p>
                    )}
                  </div>
                </div>

                {(alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED') && (
                  <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                    {alert.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        disabled={!!actionLoading}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-sm font-bold rounded-xl py-3 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        {isAckLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '✋ Tomar caso'}
                      </button>
                    )}
                    {alert.status === 'ACKNOWLEDGED' && (
                      <button
                        onClick={() => setResolveModal({ id: alert.id, notes: '' })}
                        disabled={!!actionLoading}
                        className="flex-1 bg-gray-800 hover:bg-gray-900 active:bg-black text-white text-sm font-bold rounded-xl py-3 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        Resolver alerta
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Resolver alerta</h2>
            <p className="text-sm text-gray-500 mb-4">¿Cómo finalizó esta emergencia?</p>
            
            <textarea
              value={resolveModal.notes}
              onChange={e => setResolveModal(prev => prev ? { ...prev, notes: e.target.value } : null)}
              placeholder="Notas de resolución o bitácora (opcional)"
              className="w-full border border-gray-300 rounded-xl p-3 text-sm resize-none h-24 mb-5 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
            />
            
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => handleResolve('FALSE_ALARM')}
                  disabled={!!actionLoading}
                  className="flex-1 border-2 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl py-3 text-sm font-bold disabled:opacity-50 transition-colors"
                >
                  Falsa alarma
                </button>
                <button
                  onClick={() => handleResolve('RESOLVED')}
                  disabled={!!actionLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 text-sm font-bold disabled:opacity-50 transition-colors shadow-sm shadow-green-600/20"
                >
                  Resuelta ok
                </button>
              </div>
              <button
                onClick={() => setResolveModal(null)}
                className="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
