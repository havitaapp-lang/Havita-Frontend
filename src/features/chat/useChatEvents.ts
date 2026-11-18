import { useEffect, useLayoutEffect, useRef } from 'react';
import { CHAT_EVENT_CONVERSATION, CHAT_EVENT_MESSAGE, type ChatSsePayload } from './chatTypes';

/**
 * Fase 3 — eventos del chat por la conexión SSE única de la app (useServerSync) y momentos de resincronización.
 *
 * - `onEvent`: CHAT_MESSAGE y CHAT_CONVERSATION_UPDATED.
 * - `onResync`: al reabrirse el SSE (`havita:sse-open`), al volver a primer plano y al recuperar la red. Ahí se
 *   recuperan los mensajes perdidos con `after=seq` (no hay polling periódico).
 */
export function useChatEvents(onEvent: (type: string, payload: ChatSsePayload) => void, onResync?: () => void) {
  const eventRef = useRef(onEvent);
  const resyncRef = useRef(onResync);
  // Siempre la ultima version de los callbacks, sin volver a suscribirse en cada render.
  useLayoutEffect(() => {
    eventRef.current = onEvent;
    resyncRef.current = onResync;
  });

  useEffect(() => {
    const handle = (e: Event) => {
      const payload = (e as CustomEvent<ChatSsePayload>).detail;
      if (payload?.conversation) eventRef.current(e.type, payload);
    };
    const resync = () => resyncRef.current?.();
    const onVisible = () => {
      if (document.visibilityState === 'visible') resync();
    };
    window.addEventListener(CHAT_EVENT_MESSAGE, handle);
    window.addEventListener(CHAT_EVENT_CONVERSATION, handle);
    window.addEventListener('havita:sse-open', resync);
    window.addEventListener('online', resync);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(CHAT_EVENT_MESSAGE, handle);
      window.removeEventListener(CHAT_EVENT_CONVERSATION, handle);
      window.removeEventListener('havita:sse-open', resync);
      window.removeEventListener('online', resync);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
