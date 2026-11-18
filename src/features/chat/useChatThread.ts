import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorCode } from '../../api/apiClient';
import type { ChatAuthorRole, ChatConversation, ChatMessage, ChatMessagesPage, ChatSendResult } from './chatTypes';
import {
  confirmMessage, hasGap, lastServerSeq, markFailed, markSending, mergeMessages, newClientMessageId,
} from './chatState';

export interface ThreadApi {
  messages: (conversationId: string, q?: { before?: number; after?: number; size?: number }) => Promise<ChatMessagesPage>;
  /** Envía al hilo actual (el residente sin id: su unidad activa). */
  send: (conversationId: string | null, body: string, clientMessageId: string) => Promise<ChatSendResult>;
  read: (conversationId: string, upToSeq: number) => Promise<ChatConversation>;
}

interface Options {
  conversationId: string | null;
  api: ThreadApi;
  /** Rol de quien escribe (para el mensaje optimista). */
  selfRole: ChatAuthorRole;
  selfName: string;
  /** Si la lectura de este usuario cuenta (el residente siempre; en portería, solo el responsable). */
  canMarkRead: boolean;
  readSeq: number;
  onConversation: (c: ChatConversation) => void;
}

const PAGE = 30;
/** Máximo de páginas al recuperar tras una desconexión (más allá, se recarga el hilo). */
const MAX_CATCHUP_PAGES = 10;

/** Fase 3 — estado de un hilo de chat (portería o residente). */
export function useChatThread({ conversationId, api, selfRole, selfName, canMarkRead, readSeq, onConversation }: Options) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const idRef = useRef(conversationId);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const onConvRef = useRef(onConversation);
  onConvRef.current = onConversation;
  const prevIdRef = useRef<string | null>(null);

  // Carga inicial (o cambio de conversación). Si el hilo acaba de crearse con nuestro primer mensaje, no se borra lo
  // que ya se ve: se recupera lo que falte.
  useEffect(() => {
    idRef.current = conversationId;
    const prev = prevIdRef.current;
    prevIdRef.current = conversationId;
    setSendError(null);
    if (!conversationId) {
      setMessages([]);
      setHasMore(false);
      setError(null);
      return;
    }
    const keep = prev === null && messagesRef.current.length > 0;
    if (!keep) {
      setMessages([]);
      setHasMore(false);
    }
    let cancelled = false;
    setLoading(!keep);
    setError(null);
    api.messages(conversationId, { size: PAGE })
      .then((page) => {
        if (cancelled || idRef.current !== conversationId) return;
        setMessages((cur) => mergeMessages(keep ? cur : [], page.messages));
        setHasMore(page.hasMore);
        onConvRef.current(page.conversation);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar la conversación.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const loadOlder = useCallback(async () => {
    const id = idRef.current;
    const first = messagesRef.current.find((m) => !m.localState);
    if (!id || !first) return;
    setLoadingOlder(true);
    try {
      const page = await api.messages(id, { before: first.seq, size: PAGE });
      if (idRef.current !== id) return;
      setMessages((cur) => mergeMessages(cur, page.messages));
      setHasMore(page.hasMore);
    } catch {
      setError('No se pudieron cargar los mensajes anteriores.');
    } finally {
      setLoadingOlder(false);
    }
  }, [api]);

  /** Recupera lo perdido desde el último seq confirmado (tras reconexión o un hueco). */
  const catchUp = useCallback(async () => {
    const id = idRef.current;
    if (!id) return;
    let after = lastServerSeq(messagesRef.current);
    for (let i = 0; i < MAX_CATCHUP_PAGES; i++) {
      const page = await api.messages(id, after > 0 ? { after, size: 100 } : { size: PAGE });
      if (idRef.current !== id) return;
      setMessages((cur) => mergeMessages(cur, page.messages));
      onConvRef.current(page.conversation);
      if (after === 0) setHasMore(page.hasMore);
      if (after === 0 || !page.hasMore || page.messages.length === 0) return;
      after = page.messages[page.messages.length - 1].seq;
    }
  }, [api]);

  /** Mensaje recibido por SSE. */
  const applyIncoming = useCallback((m: ChatMessage) => {
    if (!idRef.current || m.conversationId !== idRef.current) return;
    if (hasGap(messagesRef.current, m)) {
      void catchUp().catch(() => undefined);
      return;
    }
    setMessages((cur) => mergeMessages(cur, [m]));
  }, [catchUp]);

  const deliver = useCallback(async (body: string, clientMessageId: string) => {
    setSendError(null);
    try {
      const res = await api.send(idRef.current, body, clientMessageId);
      setMessages((cur) => confirmMessage(cur, clientMessageId, res.message));
      onConvRef.current(res.conversation);
      return true;
    } catch (err) {
      setMessages((cur) => markFailed(cur, clientMessageId));
      const code = apiErrorCode(err);
      const msg = (err as { data?: { message?: string } })?.data?.message;
      setSendError(
        code === 'CHAT_RATE_LIMITED' ? 'Estás enviando mensajes muy rápido. Espera un momento.'
          : code === 'CHAT_ASSIGNED_TO_OTHER' || code === 'CHAT_RESIDENT_UNAVAILABLE' ? (msg || 'No se pudo enviar.')
            : 'No se pudo enviar el mensaje. Revisa tu conexión e inténtalo de nuevo.',
      );
      return false;
    }
  }, [api]);

  const send = useCallback(async (raw: string) => {
    const body = raw.trim();
    if (!body) return false;
    const clientMessageId = newClientMessageId();
    const optimistic: ChatMessage = {
      id: `local-${clientMessageId}`,
      conversationId: idRef.current ?? '',
      seq: Number.MAX_SAFE_INTEGER,
      authorRole: selfRole,
      authorUserId: null,
      authorName: selfName,
      body,
      createdAt: new Date().toISOString(),
      clientMessageId,
      localState: 'sending',
    };
    setMessages((cur) => [...cur, optimistic]);
    return deliver(body, clientMessageId);
  }, [deliver, selfRole, selfName]);

  /** Reintento con el MISMO clientMessageId: el servidor no lo duplica si ya lo había guardado. */
  const retry = useCallback((clientMessageId: string) => {
    const m = messagesRef.current.find((x) => x.localState && x.clientMessageId === clientMessageId);
    if (!m) return;
    setMessages((cur) => markSending(cur, clientMessageId));
    void deliver(m.body, clientMessageId);
  }, [deliver]);

  // Marcar como leído cuando el hilo está visible y hay mensajes nuevos.
  const last = lastServerSeq(messages);
  useEffect(() => {
    const id = conversationId;
    if (!id || !canMarkRead || last <= readSeq) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const t = setTimeout(() => {
      api.read(id, last).then((c) => onConvRef.current(c)).catch(() => undefined);
    }, 500);
    return () => clearTimeout(t);
  }, [api, conversationId, canMarkRead, last, readSeq]);

  return { messages, hasMore, loading, loadingOlder, error, sendError, loadOlder, catchUp, applyIncoming, send, retry };
}
