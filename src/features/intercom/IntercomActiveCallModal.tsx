import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Shield, User } from 'lucide-react';
import { intercomService } from '../../services/intercomService';
import type { IntercomCallResponse } from '../../services/intercomService';
import { ringtoneAudio } from './ringtone';
import { formatFullUnitPath } from '../../utils/formatters';
import {
  markIntercom,
  reportIntercomTrace,
  traceForCall,
  type IntercomMetricEvent,
  type IntercomTrace,
} from './callMetrics';
import { releasePreparedMicrophone, removePreconnect, takePreparedMicrophone } from './fastConnect';
import { discardPreInitialized, INTERCOM_SDK_MODULES, joinWithRetry, takePreInitialized } from './earlyPrepare';
import {
  attachWebrtcDiagnostics,
  beginWebrtcDiagnostics,
  endWebrtcDiagnostics,
  webrtcDiagnosticsEnabled,
} from './webrtcDiagnostics';
import { WebrtcDiagnosticsPanel } from './WebrtcDiagnosticsPanel';

interface IntercomActiveCallModalProps {
  call: IntercomCallResponse;
  isCaller: boolean; // true if portería, false if resident
  onClose: () => void;
  onCallUpdated?: (call: IntercomCallResponse) => void;
}

const TERMINAL_STATUSES = ['REJECTED', 'CANCELLED', 'MISSED', 'ENDED', 'FAILED'];

/**
 * P8-A: si tras unirse a la sala no llega audio remoto en este plazo, se AVISA, pero NO se da la llamada por
 * conectada. Antes, un temporizador de 1 s marcaba «Conectado» sin audio real.
 */
export const NO_REMOTE_AUDIO_WARNING_MS = 8000;
/** Respaldo del evento `audioUpdate`. Solo sondea mientras no se reproduce audio remoto. */
const REMOTE_AUDIO_FALLBACK_POLL_MS = 200;
/** Margen para una reconexión de red pasajera del interlocutor. */
const PARTICIPANT_LEFT_GRACE_MS = 4000;

type Unsubscribe = () => void;

/** Suscripción a un emisor del SDK (`on`/`off`, o `removeListener`). Devuelve la baja. */
const subscribe = (target: any, event: string, handler: (...args: any[]) => void): Unsubscribe => {
  if (!target || typeof target.on !== 'function') return () => {};
  target.on(event, handler);
  return () => {
    try {
      if (typeof target.off === 'function') target.off(event, handler);
      else target.removeListener?.(event, handler);
    } catch {
      /* el emisor ya no existe */
    }
  };
};

export const IntercomActiveCallModal: React.FC<IntercomActiveCallModalProps> = ({
  call: initialCall,
  isCaller,
  onClose,
  onCallUpdated,
}) => {
  const [call, setCall] = useState<IntercomCallResponse>(initialCall);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('Iniciando llamada...');

  const [meeting, initMeeting] = useRealtimeKitClient();
  // P8-A3: cliente inicializado mientras timbraba (no pasa por el hook); el resto del modal usa activeMeeting.
  const [earlyClient, setEarlyClient] = useState<any>(null);
  const activeMeeting = meeting ?? earlyClient;
  const meetingRef = useRef<any>(null);
  if (activeMeeting) meetingRef.current = activeMeeting;

  const joiningTokenRef = useRef<string | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const disconnectGraceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMarkedConnectedRef = useRef(false);
  const hasLeftRoomRef = useRef(false);
  const unbindListenersRef = useRef<Unsubscribe | null>(null);
  const autoplayBlockedRef = useRef(false);
  const playPendingRef = useRef(false);
  const terminatedRef = useRef(false);
  const durationRef = useRef(0);
  durationRef.current = duration;

  const [isRoomJoined, setIsRoomJoined] = useState(false);
  const [isRemoteAudioActive, setIsRemoteAudioActive] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [noRemoteAudioWarning, setNoRemoteAudioWarning] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const activeCallId = call.callId || (call as any).id;

  // P8-A2: traza de métricas de esta llamada en este navegador (sin tokens ni datos personales).
  const traceRef = useRef<IntercomTrace | null>(null);
  if (!traceRef.current) {
    traceRef.current = traceForCall(activeCallId, isCaller ? 'CALLER' : 'RECIPIENT', call.meetingId || call.realtimeMeetingId);
  }
  const mark = useCallback((event: IntercomMetricEvent, detail?: unknown) => {
    markIntercom(traceRef.current ?? undefined, event, detail);
  }, []);

  // Sync state if initialCall changes externally
  useEffect(() => {
    setCall(initialCall);
  }, [initialCall]);

  useEffect(() => {
    terminatedRef.current = TERMINAL_STATUSES.includes(call.status);
    if (call.status === 'ACCEPTED') mark('RESIDENT_ACCEPTED', 'status');
  }, [call.status, mark]);

  // Duración en pantalla: cuenta desde que se OYE al interlocutor. Si no llega audio remoto pero el backend confirma
  // que ambos están en la sala, empieza tras el aviso de «sin audio».
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const counting = isRemoteAudioActive || (!!call.connectedAt && noRemoteAudioWarning);
    if (call.status === 'ACCEPTED' && counting) {
      timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [call.status, isRemoteAudioActive, call.connectedAt, noRemoteAudioWarning]);

  // Format duration into mm:ss
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Mensaje de estado: «Conectado» SOLO con audio remoto reproduciéndose.
  useEffect(() => {
    switch (call.status) {
      case 'INITIATING':
        setStatusMessage('Estableciendo conexión con portería...');
        break;
      case 'RINGING':
        setStatusMessage(isCaller ? 'Timbrando en la vivienda...' : 'Llamada entrante...');
        break;
      case 'ACCEPTED':
        if (mediaError) {
          setStatusMessage('No se pudo conectar el audio');
        } else if (autoplayBlocked) {
          setStatusMessage('Toca «Activar audio» para escuchar');
        } else if (isRemoteAudioActive) {
          setStatusMessage('Conectado en tiempo real');
        } else if (noRemoteAudioWarning) {
          setStatusMessage('Sin audio del interlocutor todavía');
        } else if (isRoomJoined) {
          setStatusMessage('Esperando audio del interlocutor...');
        } else {
          setStatusMessage('Conectando audio...');
        }
        break;
      case 'REJECTED':
        setStatusMessage(isCaller ? 'La llamada fue rechazada' : 'Llamada rechazada');
        break;
      case 'MISSED':
        setStatusMessage('Sin respuesta');
        break;
      case 'CANCELLED':
        setStatusMessage('Llamada cancelada');
        break;
      case 'ENDED':
        setStatusMessage('Llamada finalizada');
        break;
      case 'FAILED':
        setStatusMessage('Error al conectar llamada');
        break;
    }
  }, [call.status, isCaller, isRoomJoined, isRemoteAudioActive, autoplayBlocked, noRemoteAudioWarning, mediaError]);

  // Aviso honesto (no simula conexión) si tras unirse no llega audio remoto.
  useEffect(() => {
    if (!isRoomJoined || isRemoteAudioActive || call.status !== 'ACCEPTED') return;
    const warningTimer = setTimeout(() => {
      setNoRemoteAudioWarning(true);
      mark('NO_REMOTE_AUDIO_WARNING');
    }, NO_REMOTE_AUDIO_WARNING_MS);
    return () => clearTimeout(warningTimer);
  }, [isRoomJoined, isRemoteAudioActive, call.status, mark]);

  // Handle ringback for caller while status is RINGING (Local tone, NO RealtimeKit connection)
  useEffect(() => {
    if (isCaller && (call.status === 'INITIATING' || call.status === 'RINGING')) {
      ringtoneAudio.startOutgoingRingback();
    } else {
      ringtoneAudio.stop();
    }
    return () => {
      ringtoneAudio.stop();
    };
  }, [isCaller, call.status]);

  /** Reproduce el elemento de audio remoto. Un bloqueo de autoplay se muestra (botón) en vez de silenciarse. */
  const playRemoteAudio = useCallback((fromUserGesture = false) => {
    const el = remoteAudioRef.current;
    if (!el || terminatedRef.current || playPendingRef.current) return;
    if (autoplayBlockedRef.current && !fromUserGesture) return;
    playPendingRef.current = true;
    Promise.resolve()
      .then(() => el.play())
      .then(() => {
        autoplayBlockedRef.current = false;
        setAutoplayBlocked(false);
        setIsRemoteAudioActive(true);
        mark('REMOTE_AUDIO_PLAYBACK_STARTED');
        mark('AUDIO_READY');
      })
      .catch((err: any) => {
        if (err?.name === 'NotAllowedError') {
          autoplayBlockedRef.current = true;
          setAutoplayBlocked(true);
          mark('AUTOPLAY_BLOCKED', 'play');
        } else {
          mark('MEDIA_ERROR', `play:${err?.name ?? 'error'}`);
        }
      })
      .finally(() => {
        playPendingRef.current = false;
      });
  }, [mark]);

  /** Adjunta la pista remota al elemento de audio en cuanto el SDK la entrega, y la reproduce. */
  const attachRemoteTrack = useCallback((track?: MediaStreamTrack | null) => {
    const el = remoteAudioRef.current;
    if (!track || !el || terminatedRef.current) return;
    const current = el.srcObject as MediaStream | null;
    const alreadyAttached = !!current?.getAudioTracks?.().some((t) => t.id === track.id);
    if (!alreadyAttached) {
      el.srcObject = new MediaStream([track]);
      mark('REMOTE_AUDIO_TRACK_RECEIVED');
    } else if (!el.paused) {
      return;
    }
    playRemoteAudio();
  }, [mark, playRemoteAudio]);

  const syncRemoteAudioFromParticipants = useCallback(() => {
    try {
      const m = meetingRef.current;
      if (!m || terminatedRef.current) return;
      const joined = m.participants?.joined ? Array.from(m.participants.joined.values()) : [];
      for (const p of joined as any[]) {
        if (p?.audioTrack && p.audioEnabled !== false) {
          attachRemoteTrack(p.audioTrack);
          return;
        }
      }
    } catch {
      /* participantes no disponibles todavía */
    }
  }, [attachRemoteTrack]);

  const leaveMeeting = useCallback((reason: string) => {
    unbindListenersRef.current?.();
    unbindListenersRef.current = null;
    const m = meetingRef.current;
    if (m && !hasLeftRoomRef.current) {
      hasLeftRoomRef.current = true;
      try {
        Promise.resolve(m.leave())
          .then(() => mark('MEETING_CLOSED', reason))
          .catch(() => mark('MEDIA_ERROR', 'leave'));
      } catch {
        /* ya cerrada */
      }
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  }, [mark]);

  // Siempre la versión vigente de colgar, para los listeners del SDK registrados una sola vez.
  const handleHangupRef = useRef<() => void>(() => {});

  /**
   * Listeners del SDK, registrados sobre el cliente devuelto por `init` y ANTES de `join()`, para no perder
   * `roomJoined`, `participantJoined` ni `audioUpdate`. Antes se registraban en un efecto que solo se ejecutaba al
   * montar, cuando la reunión aún no existía, y nunca se registraban.
   */
  const bindMeetingListeners = useCallback((client: any) => {
    unbindListenersRef.current?.();
    const offs: Unsubscribe[] = [];
    const self = client?.self;
    const joined = client?.participants?.joined;
    const meta = client?.meta;

    offs.push(subscribe(self, 'roomJoined', () => {
      setIsRoomJoined(true);
      mark('JOIN_COMPLETED', 'roomJoined');
    }));
    offs.push(subscribe(self, 'roomLeft', () => {
      setIsRoomJoined(false);
      setIsRemoteAudioActive(false);
      mark('MEETING_CLOSED', 'roomLeft');
    }));
    offs.push(subscribe(self, 'audioUpdate', (payload: any) => {
      if (payload?.audioEnabled && payload?.audioTrack) mark('MICROPHONE_READY', 'audioUpdate');
    }));
    offs.push(subscribe(self, 'mediaPermissionError', (payload: any) => {
      mark('MEDIA_ERROR', `permission:${payload?.kind ?? ''}:${payload?.message ?? ''}`);
    }));
    offs.push(subscribe(self, 'autoplayError', () => {
      autoplayBlockedRef.current = true;
      setAutoplayBlocked(true);
      mark('AUTOPLAY_BLOCKED', 'sdk');
    }));
    offs.push(subscribe(joined, 'participantJoined', (participant: any) => {
      mark('REMOTE_PARTICIPANT_JOINED');
      if (disconnectGraceTimeoutRef.current) {
        clearTimeout(disconnectGraceTimeoutRef.current);
        disconnectGraceTimeoutRef.current = null;
      }
      if (participant?.audioEnabled && participant?.audioTrack) attachRemoteTrack(participant.audioTrack);
    }));
    offs.push(subscribe(joined, 'participantLeft', () => {
      mark('REMOTE_PARTICIPANT_LEFT');
      setIsRemoteAudioActive(false);
      setStatusMessage('Reconectando con el interlocutor...');
      if (disconnectGraceTimeoutRef.current) clearTimeout(disconnectGraceTimeoutRef.current);
      // Margen para una reconexión de red pasajera; si no vuelve, se cuelga y se registra en el backend.
      disconnectGraceTimeoutRef.current = setTimeout(() => {
        setStatusMessage('El interlocutor finalizó la llamada');
        handleHangupRef.current();
      }, PARTICIPANT_LEFT_GRACE_MS);
    }));
    // Eventos de participante reemitidos por el mapa: (participante, payload).
    offs.push(subscribe(joined, 'audioUpdate', (_participant: any, payload: any) => {
      if (payload?.audioEnabled && payload?.audioTrack) attachRemoteTrack(payload.audioTrack);
    }));
    // Estado de los transportes WebRTC (ICE + DTLS) hacia el SFU: equivalente disponible de «ICE conectado».
    offs.push(subscribe(meta, 'mediaConnectionUpdate', (update: any) => {
      if (update?.state === 'connected') {
        mark('ICE_CONNECTED', update.transport);
        if (update.transport === 'send' && client?.self?.audioEnabled) mark('LOCAL_AUDIO_PUBLISHED', 'send-transport');
      } else if (update?.state === 'failed') {
        mark('MEDIA_ERROR', `transport:${update.transport}:failed`);
      }
    }));
    // P8-A5 (bandera VITE_INTERCOM_WEBRTC_DIAGNOSTICS): getStats() y eventos de red, sin esperas; vacío si está desactivada.
    offs.push(attachWebrtcDiagnostics(client, traceRef.current));

    unbindListenersRef.current = () => offs.forEach((off) => off());
  }, [attachRemoteTrack, mark]);

  // RealtimeKit Initialization: strictly ONLY join when call is ACCEPTED (never while RINGING)
  // Optimized: disabled 10 unused modules (chat, poll, stage, plugin, recording, etc.) to minimize init latency
  useEffect(() => {
    const token = call.participantToken;
    if (!token) return;

    // Strictly enforce: No WebRTC connection until call is ACCEPTED by both parties
    if (call.status !== 'ACCEPTED') return;

    // Prevent duplicate joining for the exact same token
    if (joiningTokenRef.current === token) return;
    joiningTokenRef.current = token;

    const setupMeeting = async () => {
      // Se recogen ANTES de cualquier await, para que el desmontaje simulado de StrictMode no los libere:
      // - P8-A3 (bandera): cliente del SDK ya inicializado mientras timbraba (sin micrófono ni join);
      // - P8-A2 (bandera): micrófono preparado al pulsar «Contestar».
      const earlyPromise = activeCallId ? takePreInitialized(activeCallId) : undefined;
      const preparedPromise = activeCallId ? takePreparedMicrophone(activeCallId) : undefined;
      try {
        let client: any = null;
        let usedEarly = false;
        if (earlyPromise) {
          client = await earlyPromise;
          usedEarly = !!client;
          if (terminatedRef.current) {
            hasLeftRoomRef.current = true;
            try { await client?.leave(); } catch { /* sin sala */ }
            if (preparedPromise) await releasePreparedMicrophone(activeCallId, await preparedPromise);
            return;
          }
          if (usedEarly && preparedPromise) await releasePreparedMicrophone(activeCallId, await preparedPromise);
        }

        if (!client) {
          let preparedMedia: Awaited<NonNullable<typeof preparedPromise>> = null;
          if (preparedPromise) {
            preparedMedia = await preparedPromise;
            if (preparedMedia) mark('MICROPHONE_READY', 'initMedia');
            if (terminatedRef.current) {
              await releasePreparedMicrophone(activeCallId, preparedMedia);
              return;
            }
          } else {
            // Pre-request microphone permission only if it has NOT been granted yet.
            // If already granted, calling getUserMedia() still takes ~500ms (OS audio device init)
            // and the SDK then calls it AGAIN — resulting in net overhead, not savings.
            // Only request early when state is 'prompt' (browser will show a dialog during SDK init).
            mark('MICROPHONE_REQUEST_STARTED');
            try {
              const permResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });
              if (permResult.state === 'prompt') {
                const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                // Release immediately — the SDK will acquire its own stream with its own constraints
                micStream.getTracks().forEach((t) => t.stop());
                mark('MICROPHONE_READY', 'pre-request');
              }
              // If 'granted' or 'denied', skip — SDK handles both cases on its own without blocking
            } catch (micErr: any) {
              // navigator.permissions not supported in all browsers — log and continue
              console.warn('[IntercomAudio] Mic permission check failed (SDK will handle):', micErr?.name);
            }
          }

          if (terminatedRef.current) return;
          // P8-A5: antes de init, para observar las conexiones que crea el SDK. Síncrono; no-op sin la bandera.
          beginWebrtcDiagnostics(traceRef.current);
          mark('SDK_INITIALIZATION_STARTED');
          client = await initMeeting({
            authToken: token,
            defaults: preparedMedia
              // API pública del SDK 2.0.3: DefaultOptions.mediaHandler reutiliza el micrófono ya preparado.
              ? { video: false, audio: true, mediaHandler: preparedMedia as any }
              : { video: false, audio: true },
            // NOTE: internals must remain enabled — it manages participant audio track population.
            modules: INTERCOM_SDK_MODULES as any,
          });

          if (!client) {
            console.warn('[IntercomAudio] RealtimeKit initMeeting did not return client');
            mark('MEDIA_ERROR', 'init-no-client');
            return;
          }
          mark('SDK_INITIALIZATION_COMPLETED');
        }

        meetingRef.current = client;
        if (usedEarly) setEarlyClient(client);
        if (!usedEarly && (client as any).self?.audioTrack) mark('MICROPHONE_READY', 'sdk-init');

        // Se cuelga o se cancela durante el init: no se entra a la sala (no se generan minutos de participante).
        if (terminatedRef.current) {
          hasLeftRoomRef.current = true;
          // Libera el micrófono que el SDK capturó en init (defaults.audio).
          try {
            Promise.resolve(client.leave()).catch(() => {});
          } catch {
            /* sin sala */
          }
          return;
        }

        bindMeetingListeners(client);

        if (usedEarly) {
          // P8-A3: el micrófono se abre AHORA (tras la aceptación del residente: consentimiento), no mientras timbraba.
          mark('MICROPHONE_REQUEST_STARTED', 'enableAudio');
          try {
            await client.self.enableAudio();
            mark('MICROPHONE_READY', 'enableAudio');
          } catch (micErr: any) {
            mark('MEDIA_ERROR', `enableAudio:${micErr?.name ?? 'error'}`);
          }
          if (terminatedRef.current) return;
          mark('JOIN_STARTED', 'early');
          // La activación de la reunión puede tardar en propagarse: reintentos breves.
          const failures = await joinWithRetry(client);
          if (failures) mark('JOIN_RETRY', String(failures));
        } else {
          mark('JOIN_STARTED');
          await client.join();
        }
        setIsRoomJoined(true);
        mark('JOIN_COMPLETED');

        if (activeCallId && activeCallId !== 'undefined' && !hasMarkedConnectedRef.current) {
          hasMarkedConnectedRef.current = true;
          // P8-A6: el backend cierra una llamada aceptada que no queda conectada en su plazo; por eso un fallo
          // pasajero de esta petición se reintenta (1 s y 2 s) en lugar de ignorarse.
          const reportConnected = (attempt: number) => {
            intercomService.markConnected(activeCallId).catch(() => {
              if (attempt < 3 && !terminatedRef.current) setTimeout(() => reportConnected(attempt + 1), 1000 * attempt);
            });
          };
          reportConnected(1);
        }

        // Puede que el interlocutor ya estuviera en la sala con su pista publicada.
        syncRemoteAudioFromParticipants();
      } catch (err: any) {
        console.error('[IntercomAudio] Failed to initialize/join RealtimeKit meeting:', err?.name ?? err);
        mark('MEDIA_ERROR', `init-join:${err?.name ?? 'error'}`);
        setMediaError('No se pudo conectar el audio');
      }
    };

    setupMeeting();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.participantToken, call.status, initMeeting]);

  // Respaldo por sondeo SOLO mientras no hay audio remoto: cubre una pista disponible antes de registrar listeners.
  useEffect(() => {
    if (!activeMeeting || isRemoteAudioActive) return;
    if (TERMINAL_STATUSES.includes(call.status)) return;
    const interval = setInterval(syncRemoteAudioFromParticipants, REMOTE_AUDIO_FALLBACK_POLL_MS);
    syncRemoteAudioFromParticipants();
    return () => clearInterval(interval);
  }, [activeMeeting, call.status, isRemoteAudioActive, syncRemoteAudioFromParticipants]);

  // Listen to SSE events for this specific call
  useEffect(() => {
    const handleEvent = (e: CustomEvent) => {
      const payload = e.detail;
      if (!payload || (payload.callId !== activeCallId && payload.id !== activeCallId)) return;

      console.log(`[IntercomActiveCallModal] Call event received:`, e.type, payload.callId ?? payload.id);

      if (e.type === 'INTERCOM_CALL_ACCEPTED') {
        ringtoneAudio.stop();
        mark('RESIDENT_ACCEPTED', 'sse');
        setCall((prev) => ({
          ...prev,
          status: 'ACCEPTED',
          answeredAt: payload.answeredAt,
          acceptedAt: payload.acceptedAt || prev.acceptedAt,
        }));
        onCallUpdated?.({
          ...call,
          status: 'ACCEPTED',
        });
      } else if (e.type === 'INTERCOM_CALL_REJECTED') {
        ringtoneAudio.stop();
        terminatedRef.current = true;
        mark('CALL_ENDED', 'rejected');
        leaveMeeting('rejected');
        setCall((prev) => ({ ...prev, status: 'REJECTED' }));
        setTimeout(onClose, 2500);
      } else if (e.type === 'INTERCOM_CALL_CANCELLED') {
        ringtoneAudio.stop();
        terminatedRef.current = true;
        mark('CALL_ENDED', 'cancelled');
        leaveMeeting('cancelled');
        setCall((prev) => ({ ...prev, status: 'CANCELLED' }));
        setTimeout(onClose, 2000);
      } else if (e.type === 'INTERCOM_CALL_MISSED') {
        ringtoneAudio.stop();
        terminatedRef.current = true;
        mark('CALL_ENDED', 'missed');
        leaveMeeting('missed');
        setCall((prev) => ({ ...prev, status: 'MISSED' }));
        setTimeout(onClose, 2500);
      } else if (e.type === 'INTERCOM_CALL_CONNECTED') {
        setCall((prev) => ({
          ...prev,
          callerConnectedAt: payload.callerConnectedAt || prev.callerConnectedAt,
          recipientConnectedAt: payload.recipientConnectedAt || prev.recipientConnectedAt,
          connectedAt: payload.connectedAt || prev.connectedAt,
        }));
      } else if (e.type === 'INTERCOM_CALL_ENDED') {
        ringtoneAudio.stop();
        terminatedRef.current = true;
        mark('CALL_ENDED', 'ended');
        leaveMeeting('ended');
        setCall((prev) => ({
          ...prev,
          status: 'ENDED',
          durationSeconds: payload.durationSeconds ?? durationRef.current,
        }));
        setTimeout(onClose, 2500);
      }
    };

    window.addEventListener('INTERCOM_CALL_ACCEPTED', handleEvent as EventListener);
    window.addEventListener('INTERCOM_CALL_CONNECTED', handleEvent as EventListener);
    window.addEventListener('INTERCOM_CALL_REJECTED', handleEvent as EventListener);
    window.addEventListener('INTERCOM_CALL_CANCELLED', handleEvent as EventListener);
    window.addEventListener('INTERCOM_CALL_MISSED', handleEvent as EventListener);
    window.addEventListener('INTERCOM_CALL_ENDED', handleEvent as EventListener);

    return () => {
      window.removeEventListener('INTERCOM_CALL_ACCEPTED', handleEvent as EventListener);
      window.removeEventListener('INTERCOM_CALL_CONNECTED', handleEvent as EventListener);
      window.removeEventListener('INTERCOM_CALL_REJECTED', handleEvent as EventListener);
      window.removeEventListener('INTERCOM_CALL_CANCELLED', handleEvent as EventListener);
      window.removeEventListener('INTERCOM_CALL_MISSED', handleEvent as EventListener);
      window.removeEventListener('INTERCOM_CALL_ENDED', handleEvent as EventListener);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCallId, onClose, onCallUpdated, leaveMeeting, mark]);

  // Periodic polling fallback in case SSE connection experienced a hiccup
  useEffect(() => {
    if (call.status !== 'INITIATING' && call.status !== 'RINGING') return;

    const pollInterval = setInterval(async () => {
      if (!activeCallId || activeCallId === 'undefined') return;

      try {
        const detail = await intercomService.getCallDetail(activeCallId);
        if (detail && detail.status !== call.status) {
          if (detail.status === 'ACCEPTED') mark('RESIDENT_ACCEPTED', 'poll');
          setCall(detail);
          onCallUpdated?.(detail);
          if (TERMINAL_STATUSES.includes(detail.status)) {
            ringtoneAudio.stop();
            terminatedRef.current = true;
            mark('CALL_ENDED', `poll:${detail.status}`);
            setTimeout(onClose, 2500);
          }
        }
      } catch {}
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [activeCallId, call.status, onClose, onCallUpdated, mark]);

  // Cleanup strictly on modal unmount (prevents spurious execution on meeting state change)
  useEffect(() => {
    return () => {
      ringtoneAudio.stop();
      if (disconnectGraceTimeoutRef.current) clearTimeout(disconnectGraceTimeoutRef.current);
      unbindListenersRef.current?.();
      unbindListenersRef.current = null;
      if (meetingRef.current && !hasLeftRoomRef.current) {
        hasLeftRoomRef.current = true;
        try {
          Promise.resolve(meetingRef.current.leave()).catch(() => {});
        } catch {}
      }
      reportIntercomTrace(traceRef.current ?? undefined);
      endWebrtcDiagnostics(traceRef.current);
      // P8-A2: un micrófono preparado y no recogido por setupMeeting se libera; la preconexión se retira.
      if (activeCallId) void releasePreparedMicrophone(activeCallId);
      if (activeCallId) void discardPreInitialized(activeCallId);
      removePreconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle Microphone Mute
  const handleToggleMute = async () => {
    if (!activeMeeting) return;
    try {
      if (isMuted) {
        await activeMeeting.self.enableAudio();
        setIsMuted(false);
      } else {
        await activeMeeting.self.disableAudio();
        setIsMuted(true);
      }
    } catch (e) {
      console.warn('[IntercomAudio] Failed to toggle audio mute', e);
    }
  };

  // Hangup / Cancel Call
  const handleHangup = async () => {
    ringtoneAudio.stop();
    const statusAtHangup = call.status;
    terminatedRef.current = true;
    if (disconnectGraceTimeoutRef.current) {
      clearTimeout(disconnectGraceTimeoutRef.current);
      disconnectGraceTimeoutRef.current = null;
    }
    mark('CALL_ENDED', `local:${statusAtHangup}`);

    // Immediately leave RealtimeKit WebRTC room to close Cloudflare media tracks and session
    leaveMeeting('hangup');

    try {
      if (activeCallId && activeCallId !== 'undefined') {
        if (statusAtHangup === 'RINGING' || statusAtHangup === 'INITIATING') {
          if (isCaller) {
            await intercomService.cancelCall(activeCallId);
            setCall((prev) => ({ ...prev, status: 'CANCELLED' }));
          } else {
            await intercomService.rejectCall(activeCallId);
            setCall((prev) => ({ ...prev, status: 'REJECTED' }));
          }
        } else if (statusAtHangup === 'ACCEPTED') {
          await intercomService.endCall(activeCallId);
          setCall((prev) => ({ ...prev, status: 'ENDED' }));
        }
      }
    } catch (e: any) {
      console.error('[IntercomAudio] Error terminating call', e);
    } finally {
      setTimeout(onClose, 1200);
    }
  };
  handleHangupRef.current = handleHangup;

  const isCallActive = call.status === 'ACCEPTED';
  const isTerminated = ['REJECTED', 'CANCELLED', 'MISSED', 'ENDED', 'FAILED'].includes(call.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden text-white flex flex-col items-center p-6 text-center relative">
        {/* Unit & Role Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 mb-6 border border-slate-700">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span>
            {formatFullUnitPath({
              path: call.propertyUnit,
              propertyUnit: (call as any).propertyUnit,
              tower: call.propertyTower,
              number: call.propertyNumber,
            })}
          </span>
        </div>

        {/* Avatar / Calling Waves */}
        <div className="relative mb-6">
          {isCallActive ? (
            <div className="absolute -inset-4 bg-emerald-500/20 rounded-full animate-ping pointer-events-none" />
          ) : call.status === 'RINGING' ? (
            <div className="absolute -inset-4 bg-blue-500/20 rounded-full animate-ping pointer-events-none" />
          ) : null}

          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-inner transition-colors duration-500 ${
              isCallActive
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white'
                : isTerminated
                ? 'bg-slate-800 text-slate-400'
                : 'bg-gradient-to-tr from-blue-600 to-cyan-500 text-white'
            }`}
          >
            {isCaller ? (
              <User className="w-12 h-12" />
            ) : (
              <Shield className="w-12 h-12" />
            )}
          </div>

          {/* Connected audio speaker indicator */}
          {isCallActive && (
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg border-2 border-slate-900">
              <Volume2 className="w-4 h-4 animate-pulse" />
            </div>
          )}
        </div>

        {/* Counterpart Name */}
        <h3 className="text-xl font-bold tracking-tight mb-1">
          {isCaller ? call.recipientName : call.callerName}
        </h3>
        <p className="text-sm text-slate-400 mb-4 font-medium">
          {isCaller ? call.recipientRole : 'Portería Principal'}
        </p>

        {/* Status & Timer */}
        <div className="mb-8">
          {isCallActive ? (
            <div className="flex flex-col items-center">
              <span className="text-3xl font-mono font-bold tracking-wider text-emerald-400">
                {formatDuration(duration)}
              </span>
              <span className="text-xs text-slate-400 mt-1" data-testid="intercom-status">{statusMessage}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-1">
              <span
                className={`text-sm font-semibold tracking-wide ${
                  isTerminated ? 'text-rose-400' : 'text-blue-400 animate-pulse'
                }`}
              >
                <span data-testid="intercom-status">{statusMessage}</span>
              </span>
              {call.status === 'RINGING' && (
                <span className="text-xs text-slate-500">
                  Esperando respuesta del habitante...
                </span>
              )}
            </div>
          )}
        </div>

        {/* Animated Audio Waveform when active */}
        {isCallActive && (
          <div className="flex items-center gap-1.5 h-6 mb-8">
            <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_100ms] h-3"></span>
            <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_200ms] h-6"></span>
            <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_300ms] h-4"></span>
            <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_150ms] h-5"></span>
            <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_250ms] h-3"></span>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-6 w-full">
          {/* Mute Button (only enabled when call is active) */}
          {isCallActive && (
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-md ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
          )}

          {/* P8-A: el navegador bloqueó la reproducción automática; se necesita un gesto del usuario */}
          {isCallActive && autoplayBlocked && (
            <button
              onClick={() => playRemoteAudio(true)}
              title="Activar audio"
              data-testid="intercom-enable-audio"
              className="h-14 px-4 rounded-full flex items-center justify-center gap-2 bg-amber-500 text-slate-950 font-semibold shadow-md"
            >
              <VolumeX className="w-5 h-5" />
              Activar audio
            </button>
          )}

          {/* Hangup / Cancel Button */}
          <button
            onClick={handleHangup}
            disabled={isTerminated}
            title={isCallActive ? 'Colgar llamada' : 'Cancelar'}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-rose-950/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCallActive ? <PhoneOff className="w-7 h-7" /> : <Phone className="w-7 h-7 rotate-[135deg]" />}
          </button>
        </div>

        {/* P8-A5: solo con VITE_INTERCOM_WEBRTC_DIAGNOSTICS; lectura y copia del resumen sanitizado */}
        {webrtcDiagnosticsEnabled() && <WebrtcDiagnosticsPanel trace={traceRef.current} />}
      </div>
    </div>
  );
};
