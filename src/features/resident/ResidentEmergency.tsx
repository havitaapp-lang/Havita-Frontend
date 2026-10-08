import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { panicService } from '../../services/panicService';
import type { PanicAlert } from '../../types';

const ALERT_ICONS: Record<string, string> = {
  MEDICAL: '🚑',
  SECURITY: '🛡️',
  FIRE: '🔥',
  OTHER: '⚠️',
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Activa', color: 'bg-red-100 text-red-700' },
  ACKNOWLEDGED: { label: 'En atención', color: 'bg-amber-100 text-amber-700' },
  RESOLVED: { label: 'Resuelta', color: 'bg-green-100 text-green-700' },
  FALSE_ALARM: { label: 'Falsa alarma', color: 'bg-gray-100 text-gray-600' },
};

export default function ResidentEmergency() {
  const [alerts, setAlerts] = useState<PanicAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    panicService.getMyAlerts()
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Escuchar actualizaciones en tiempo real
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const alert = (e as CustomEvent).detail?.alert as PanicAlert;
      if (!alert) return;
      setAlerts(prev => {
        const exists = prev.some(a => a.id === alert.id);
        if (exists) return prev.map(a => a.id === alert.id ? alert : a);
        return [alert, ...prev];
      });
    };
    window.addEventListener('PANIC_ALERT', handleUpdate);
    window.addEventListener('PANIC_ALERT_UPDATED', handleUpdate);
    return () => {
      window.removeEventListener('PANIC_ALERT', handleUpdate);
      window.removeEventListener('PANIC_ALERT_UPDATED', handleUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 mb-24">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-6 w-6 text-red-600" />
        <h1 className="text-xl font-bold text-gray-900">Mis Alertas de Emergencia</h1>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No tienes alertas registradas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => {
            const badge = STATUS_BADGE[alert.status] ?? STATUS_BADGE.ACTIVE;
            return (
              <div key={alert.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{ALERT_ICONS[alert.alertType] ?? '⚠️'}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{alert.alertTypeLabel}</p>
                      {alert.notes && <p className="text-sm text-gray-500 mt-0.5">{alert.notes}</p>}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(alert.createdAt).toLocaleString('es-CO')}</span>
                </div>
                {alert.acknowledgedByName && (
                  <p className="mt-1 text-xs text-amber-600">
                    ✔ Tomada por {alert.acknowledgedByName}
                    {alert.acknowledgedAt ? ` a las ${new Date(alert.acknowledgedAt).toLocaleTimeString('es-CO')}` : ''}
                  </p>
                )}
                {alert.resolvedByName && (
                  <p className="mt-1 text-xs text-green-600">
                    ✔ Resuelta por {alert.resolvedByName}
                  </p>
                )}
                {alert.resolutionNotes && (
                  <p className="mt-1 text-xs text-gray-500 italic">"{alert.resolutionNotes}"</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
