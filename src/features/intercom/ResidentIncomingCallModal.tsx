import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Phone, PhoneOff, Shield, Building2 } from 'lucide-react';
import { intercomService } from '../../services/intercomService';
import type { IntercomCallResponse } from '../../services/intercomService';
import { pushNotificationService } from '../../services/pushNotificationService';
import { ringtoneAudio } from './ringtone';
import { IntercomActiveCallModal } from './IntercomActiveCallModal';
import { bindIntercomTrace, markIntercom, traceForCall } from './callMetrics';
import { preconnectRealtime, prepareMicrophoneForCall, releasePreparedMicrophone, removePreconnect } from './fastConnect';
import { discardPreInitialized, earlyPrepareEnabled, preInitializeForCall } from './earlyPrepare';
import { formatFullUnitPath } from '../../utils/formatters';

const cleanUnitDisplay = (tower?: string, number?: string, path?: string): string => {
  return formatFullUnitPath({ tower, number, path });
};

/** P8-B: parámetro con el que el aviso push abre la llamada (`/resident?intercomCall=<id>`). */
export const INTERCOM_CALL_PARAM = 'intercomCall';
/** P8-B: evento que publica useServerSync al (re)abrir el SSE; se aprovecha para recuperar una llamada perdida. */
export const SSE_OPEN_EVENT = 'havita:sse-open';

const callIdOf = (c: { callId?: string; id?: string } | null | undefined): string | undefined =>
  (c?.callId || (c as any)?.id) ?? undefined;

/** Lee el parámetro de llamada de la URL (sin modificarla). */
function readCallParam(): string | null {
  try {
    const id = new URL(window.location.href).searchParams.get(INTERCOM_CALL_PARAM);
    return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Retira el parámetro de llamada de la URL (no deja el enlace en el historial). */
function clearCallParam(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(INTERCOM_CALL_PARAM)) return;
    url.searchParams.delete(INTERCOM_CALL_PARAM);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* sin historial */
  }
}

export const ResidentIncomingCallModal: React.FC = () => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IntercomCallResponse | null>(null);
  const [activeCall, setActiveCall] = useState<IntercomCallResponse | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  // P8-B: aviso cuando se abre una llamada que ya no timbra (aviso push antiguo, otro dispositivo contestó…).
  const [endedNotice, setEndedNotice] = useState<string | null>(null);

  // Refs para deduplicar entre SSE, push y recuperación sin depender del cierre de los manejadores.
  const incomingRef = useRef<IntercomCallResponse | null>(null);
  const activeRef = useRef<IntercomCallResponse | null>(null);
  const answeringRef = useRef(false);
  const endpointRef = useRef<string | null>(null);
  // P8-B: el enlace del aviso se lee UNA vez y solo se descarta cuando su consulta termina. En desarrollo, StrictMode
  // ejecuta los efectos dos veces: si se retirara al leerlo, la segunda ejecución ya no lo vería y se perdería el aviso.
  const [initialLink] = useState<string | null>(readCallParam);
  const linkDoneRef = useRef(false);
  useEffect(() => { incomingRef.current = incomingCall; }, [incomingCall]);
  useEffect(() => { activeRef.current = activeCall; }, [activeCall]);

  const isResident = !!user && user.role === 'RESIDENT';
  const currentUserId = String(user?.id || '').toLowerCase().trim();

  /** Muestra la llamada entrante (desde SSE, push o recuperación). Idempotente por callId. */
  const present = useCallback((payload: any, source: 'sse' | 'recovery') => {
    if (!payload || !user) return;
    const callId = callIdOf(payload);
    if (!callId) return;
    const recipientUserId = String(payload.recipientUserId || '').toLowerCase().trim();
    if (recipientUserId && recipientUserId !== currentUserId) return;
    if (activeRef.current) return; // ya en una llamada
    if (callIdOf(incomingRef.current) === callId) return; // ya se está mostrando

    // P8-A8: sin volcar el payload completo (nombres de personas) en la consola.
    console.log('[ResidentIntercom] Incoming call received:', callId, source);
    markIntercom(traceForCall(callId, 'RECIPIENT'), 'RESIDENT_NOTIFIED', source);
    markIntercom(traceForCall(callId, 'RECIPIENT'), 'RINGING');
    // P8-A2 (bandera): solo DNS/TLS hacia RealtimeKit; sin token, micrófono ni unión a la reunión.
    preconnectRealtime();
    // P8-A3 (bandera): el backend entrega el token SOLO al residente llamado mientras timbra. El SDK se inicializa
    // sin micrófono ni join; la reunión sigue INACTIVE en Cloudflare hasta que el backend la active al aceptar.
    if (earlyPrepareEnabled()) {
      const trace = traceForCall(callId, 'RECIPIENT');
      intercomService.prepareCall(callId)
        .then((res) => { preInitializeForCall(callId, res.participantToken, trace); })
        .catch(() => { /* sin preparación: se contesta por el flujo normal */ });
    }

    const next: IntercomCallResponse = {
      callId,
      callerId: payload.callerId,
      callerName: payload.callerName || 'Portería Principal',
      callerRole: payload.callerRole || 'SECURITY',
      recipientUserId: payload.recipientUserId,
      recipientName: payload.recipientName || user.name,
      recipientRole: payload.recipientRole || 'RESIDENT',
      propertyId: payload.propertyId,
      propertyNumber: payload.propertyNumber || payload.propertyUnit || '',
      propertyTower: payload.propertyTower || '',
      status: 'RINGING',
      startedAt: payload.startedAt,
    } as IntercomCallResponse;
    incomingRef.current = next;
    setEndedNotice(null);
    setIncomingCall(next);

    // Start ringing sound
    ringtoneAudio.startIncomingRingtone();
    // P8-B: el aviso del sistema sobra si la llamada ya se ve en pantalla; y el endpoint de este dispositivo se
    // obtiene ahora (no al contestar) para no añadir latencia a «Contestar».
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      void pushNotificationService.closeCallNotifications(callId);
    }
    void pushNotificationService.getCurrentEndpoint().then((ep) => { endpointRef.current = ep; });
  }, [user, currentUserId]);

  /** Cierra el modal de una llamada que dejó de timbrar. */
  const dismissIfMatches = useCallback((pId: string | undefined, notice?: string) => {
    if (!pId || callIdOf(incomingRef.current) !== pId || answeringRef.current) return;
    ringtoneAudio.stop();
    removePreconnect();
    void discardPreInitialized(pId);
    incomingRef.current = null;
    setIncomingCall(null);
    if (notice) setEndedNotice(notice);
  }, []);

  // ── SSE (app abierta) ────────────────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isResident) return;

    const handleRinging = (e: CustomEvent) => present(e.detail, 'sse');
    const handleCancelled = (e: CustomEvent) => dismissIfMatches(callIdOf(e.detail));
    const handleMissed = (e: CustomEvent) => dismissIfMatches(callIdOf(e.detail));
    // P8-B: varios dispositivos del mismo residente: si se contestó o rechazó en otro, este deja de timbrar.
    const handleElsewhere = (e: CustomEvent) =>
      dismissIfMatches(callIdOf(e.detail), 'La llamada se atendió en otro dispositivo.');

    window.addEventListener('INTERCOM_CALL_RINGING', handleRinging as EventListener);
    window.addEventListener('INTERCOM_CALL_CANCELLED', handleCancelled as EventListener);
    window.addEventListener('INTERCOM_CALL_MISSED', handleMissed as EventListener);
    window.addEventListener('INTERCOM_CALL_ACCEPTED', handleElsewhere as EventListener);
    window.addEventListener('INTERCOM_CALL_REJECTED', handleElsewhere as EventListener);

    return () => {
      window.removeEventListener('INTERCOM_CALL_RINGING', handleRinging as EventListener);
      window.removeEventListener('INTERCOM_CALL_CANCELLED', handleCancelled as EventListener);
      window.removeEventListener('INTERCOM_CALL_MISSED', handleMissed as EventListener);
      window.removeEventListener('INTERCOM_CALL_ACCEPTED', handleElsewhere as EventListener);
      window.removeEventListener('INTERCOM_CALL_REJECTED', handleElsewhere as EventListener);
      ringtoneAudio.stop();
    };
  }, [isResident, present, dismissIfMatches]);

  // ── P8-B: recuperación (aviso push pulsado, app abierta tarde, vuelta a primer plano, reconexión) ────────────────
  useEffect(() => {
    if (!isResident) return;
    let cancelled = false;

    /**
     * P8-B (prueba física en iPhone): la llamada que se está mostrando se revalida con el servidor. Sin SSE vivo (iOS lo
     * corta en segundo plano), una cancelación no llegaba y la app seguía ofreciendo «Contestar».
     */
    const revalidateShown = async () => {
      const shownId = callIdOf(incomingRef.current);
      if (cancelled || !shownId || activeRef.current) return;
      try {
        const call = await intercomService.getCallDetail(shownId);
        if (!cancelled && call && call.status && call.status !== 'RINGING') dismissIfMatches(shownId);
      } catch {
        /* sin conexión: se mantiene; el servidor rechazará contestar si ya no timbra */
      }
    };

    const checkIncoming = async () => {
      if (incomingRef.current) return revalidateShown();
      if (cancelled || activeRef.current) return;
      try {
        const call = await intercomService.getIncomingCall();
        if (!cancelled && call && call.status === 'RINGING') present(call, 'recovery');
      } catch {
        /* sin conexión: lo cubre el SSE o el siguiente intento */
      }
    };

    /** Abre una llamada concreta (aviso pulsado). Solo se ofrece contestar si el servidor dice que sigue timbrando. */
    const openCall = async (callId: string | null) => {
      if (!callId) return checkIncoming();
      if (activeRef.current) return;
      // P8-B (F3, iPhone): la llamada ya se muestra (p. ej. presentada con el iPhone bloqueado). Al pulsar el aviso se
      // revalida con el servidor: si ya no timbra, deja de ofrecerse «Contestar».
      if (callIdOf(incomingRef.current) === callId) {
        await revalidateShown();
        if (!incomingRef.current) setEndedNotice('La llamada de portería ya terminó.');
        return;
      }
      try {
        const call = await intercomService.getCallDetail(callId);
        if (cancelled) return;
        if (callId === initialLink) linkDoneRef.current = true;
        if (call && call.status === 'RINGING') {
          present(call, 'recovery');
        } else {
          setEndedNotice('La llamada de portería ya terminó.');
        }
      } catch {
        if (cancelled) return;
        if (callId === initialLink) linkDoneRef.current = true;
        setEndedNotice('La llamada de portería ya terminó.');
      }
    };

    const onVisible = () => { if (document.visibilityState === 'visible') void checkIncoming(); };
    const onOnline = () => { void checkIncoming(); };
    const onSseOpen = () => { void checkIncoming(); };
    const onSwMessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === 'INTERCOM_OPEN_CALL') void openCall(typeof data.callId === 'string' ? data.callId : null);
      else if (data.type === 'INTERCOM_PUSH' && data.kind === 'RINGING') void checkIncoming();
      // P8-B: fin de llamada recibido por push (no depende del SSE).
      else if (data.type === 'INTERCOM_PUSH' && typeof data.callId === 'string') {
        if (data.kind === 'CANCELLED' || data.kind === 'MISSED') dismissIfMatches(data.callId);
        else if (data.kind === 'ANSWERED' || data.kind === 'REJECTED') {
          dismissIfMatches(data.callId, 'La llamada se atendió en otro dispositivo.');
        }
      }
    };

    if (initialLink && !linkDoneRef.current) {
      clearCallParam();
      void openCall(initialLink);
    } else {
      void checkIncoming();
    }

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener(SSE_OPEN_EVENT, onSseOpen);
    const sw = typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? navigator.serviceWorker : null;
    sw?.addEventListener('message', onSwMessage);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener(SSE_OPEN_EVENT, onSseOpen);
      sw?.removeEventListener('message', onSwMessage);
    };
  }, [isResident, present, dismissIfMatches, initialLink]);

  const handleReject = async () => {
    if (!incomingCall) return;
    ringtoneAudio.stop();
    const callId = incomingCall.callId || (incomingCall as any).id;
    incomingRef.current = null;
    setIncomingCall(null);
    removePreconnect();
    if (callId) void discardPreInitialized(callId);
    try {
      if (callId && callId !== 'undefined') {
        const endpoint = endpointRef.current;
        await (endpoint ? intercomService.rejectCall(callId, endpoint) : intercomService.rejectCall(callId));
      }
    } catch (e: any) {
      console.warn('[ResidentIntercom] Error rejecting call', e);
    }
  };

  const handleAccept = async () => {
    if (!incomingCall || isAnswering) return;
    setIsAnswering(true);
    answeringRef.current = true;
    ringtoneAudio.stop();

    const callId = incomingCall.callId || (incomingCall as any).id;

    try {
      if (!callId || callId === 'undefined') {
        throw new Error('Call ID is missing');
      }
      const trace = traceForCall(callId, 'RECIPIENT');
      markIntercom(trace, 'ACCEPT_REQUESTED');
      // P8-A2 (bandera): el micrófono se prepara EN PARALELO con POST /accept, solo tras pulsar «Contestar».
      // Con P8-A3 el micrófono lo abre el cliente preparado (enableAudio) tras la aceptación.
      if (!earlyPrepareEnabled() && prepareMicrophoneForCall(callId)) markIntercom(trace, 'MICROPHONE_REQUEST_STARTED', 'initMedia');
      // P8-B: endpoint ya obtenido al mostrar la llamada (sin espera aquí).
      const endpoint = endpointRef.current;
      const res = await (endpoint ? intercomService.acceptCall(callId, endpoint) : intercomService.acceptCall(callId));
      bindIntercomTrace(trace, callId, res.meetingId || res.realtimeMeetingId);
      markIntercom(trace, 'RESIDENT_ACCEPTED');
      incomingRef.current = null;
      setIncomingCall(null);
      setActiveCall({
        ...res,
        callId: res.callId || (res as any).id || callId,
      });
    } catch (e: any) {
      console.error('[ResidentIntercom] Failed to accept call', e);
      // Aceptación rechazada (p. ej. ya no timbraba): se libera el micrófono preparado.
      if (callId) void releasePreparedMicrophone(callId);
      if (callId) void discardPreInitialized(callId);
      removePreconnect();
      incomingRef.current = null;
      setIncomingCall(null);
      // P8-B: el servidor solo acepta llamadas que siguen timbrando; se informa en vez de cerrar sin más.
      setEndedNotice('La llamada de portería ya terminó.');
    } finally {
      answeringRef.current = false;
      setIsAnswering(false);
    }
  };

  // If call is actively established in RealtimeKit
  if (activeCall) {
    return (
      <IntercomActiveCallModal
        call={activeCall}
        isCaller={false}
        onClose={() => setActiveCall(null)}
        onCallUpdated={(updated) => setActiveCall(updated)}
      />
    );
  }

  // P8-B: llamada que ya no timbra (aviso antiguo u otro dispositivo): nunca se ofrece contestar.
  if (!incomingCall && endedNotice) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" data-testid="intercom-call-ended-notice">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-white text-center">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <PhoneOff className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-base font-semibold mb-6">{endedNotice}</p>
          <button
            onClick={() => setEndedNotice(null)}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  // If ringing modal
  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-white text-center flex flex-col items-center relative overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Glowing badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Llamada de Citofonía</span>
        </div>

        {/* Pulsing Avatar */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 bg-emerald-500/20 rounded-full animate-ping pointer-events-none" />
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-xl">
            <Shield className="w-12 h-12 text-white animate-pulse" />
          </div>
        </div>

        {/* Caller Info */}
        <h3 className="text-xl font-bold tracking-tight mb-1 text-white">
          {incomingCall.callerName}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-6 font-semibold bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700">
          <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            Llamada para: {cleanUnitDisplay(incomingCall.propertyTower, incomingCall.propertyNumber || (incomingCall as any).propertyUnit, (incomingCall as any).propertyUnit)}
          </span>
        </div>

        <p className="text-sm text-slate-300 mb-8 animate-pulse font-medium">
          Portería está intentando comunicarse con tu apartamento...
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-8 w-full">
          {/* Reject Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleReject}
              disabled={isAnswering}
              aria-label="Rechazar"
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-lg shadow-rose-950/50 cursor-pointer disabled:opacity-50"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs font-semibold text-rose-400">Rechazar</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleAccept}
              disabled={isAnswering}
              aria-label="Contestar"
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
            >
              {isAnswering ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Phone className="w-7 h-7 animate-bounce" />
              )}
            </button>
            <span className="text-xs font-semibold text-emerald-400">Contestar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
