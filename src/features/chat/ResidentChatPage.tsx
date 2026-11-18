import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveUnit } from '../../hooks/useActiveUnit';
import { cn } from '../../utils/cn';
import { ChatThread } from './ChatThread';
import { ChatPushPrompt } from './ChatPushPrompt';
import { residentChatService } from './chatService';
import { STATUS_LABEL_RESIDENT, sortConversations, upsertConversation } from './chatState';
import type { ChatConversation } from './chatTypes';
import { useChatEvents } from './useChatEvents';
import { useChatThread, type ThreadApi } from './useChatThread';

/**
 * Fase 3 — chat del residente con portería, para la unidad activa (el selector de unidad del encabezado cambia de
 * hilo). Solo texto. Tiempo real por la conexión SSE de la app; tras una desconexión se recupera lo perdido.
 */
export const ResidentChatPage = () => {
  const { user } = useAuth();
  const { activeUnitId, activeLabel } = useActiveUnit();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const current = useMemo(
    () => conversations.find((c) => c.propertyId === activeUnitId) ?? null,
    [conversations, activeUnitId],
  );

  const upsert = useCallback((c: ChatConversation) => setConversations((list) => upsertConversation(list, c)), []);

  const refreshList = useCallback(async () => {
    try {
      const list = await residentChatService.list();
      setConversations(sortConversations(list));
      setListError(null);
    } catch {
      setListError('No se pudo cargar el chat con portería.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList, activeUnitId]);

  const api: ThreadApi = useMemo(() => ({
    messages: residentChatService.messages,
    send: (_id, body, clientMessageId) => residentChatService.send(body, clientMessageId, activeUnitId),
    read: residentChatService.read,
  }), [activeUnitId]);

  const thread = useChatThread({
    conversationId: current?.id ?? null,
    api,
    selfRole: 'RESIDENT',
    selfName: user?.name || 'Yo',
    canMarkRead: true,
    readSeq: current?.readSeq ?? 0,
    onConversation: upsert,
  });

  useChatEvents(
    (_type, payload) => {
      upsert(payload.conversation);
      if (payload.message) thread.applyIncoming(payload.message);
    },
    () => {
      void refreshList();
      void thread.catchUp().catch(() => undefined);
    },
  );

  const otherUnread = conversations.filter((c) => c.propertyId !== activeUnitId && c.unread > 0);
  const status = current?.status ?? null;

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col h-[calc(100dvh-13rem)] md:h-[calc(100dvh-8rem)] min-h-[400px]">
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-[#16345F]" /> Chat con portería
          </h1>
          <p className="text-xs text-slate-500 truncate">{activeLabel || 'Mi unidad'} · Solo mensajes de texto</p>
        </div>
        {status && (
          <span
            data-testid="chat-status"
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full',
              status === 'ACTIVE' && 'bg-emerald-50 text-emerald-700',
              status === 'PENDING' && 'bg-amber-50 text-amber-700',
              status === 'CLOSED' && 'bg-slate-100 text-slate-500',
            )}
          >
            {status === 'ACTIVE' && <ShieldCheck className="w-3.5 h-3.5" />}
            {status === 'ACTIVE' && current?.assignedToName
              ? `Te atiende ${current.assignedToName} · Portería`
              : STATUS_LABEL_RESIDENT[status]}
          </span>
        )}
      </div>

      <ChatPushPrompt who="resident" />

      {otherUnread.length > 0 && (
        <p className="mb-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" data-testid="chat-other-units">
          Tienes mensajes sin leer de portería en otra unidad ({otherUnread.map((c) => c.unitLabel).join(', ')}). Cámbiala
          en el selector de unidad para verlos.
        </p>
      )}

      <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
        {listLoading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400" data-testid="chat-loading">Cargando…</div>
        ) : listError ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-rose-700" role="alert">{listError}</p>
            <button type="button" onClick={() => void refreshList()} className="text-sm font-bold text-[#16345F] underline">
              Reintentar
            </button>
          </div>
        ) : (
          <ChatThread
            messages={thread.messages}
            viewerRole="RESIDENT"
            hasMore={thread.hasMore}
            loading={thread.loading}
            loadingOlder={thread.loadingOlder}
            error={thread.error}
            sendError={thread.sendError}
            onLoadOlder={thread.loadOlder}
            onSend={thread.send}
            onRetry={thread.retry}
            disabledReason={!activeUnitId ? 'Selecciona una unidad para escribir a portería.' : null}
            notice={status === 'CLOSED' ? 'Portería cerró esta conversación. Si escribes, se volverá a abrir.' : null}
            emptyText="Escríbele a portería: paquetes, visitas, novedades… Te responderán por aquí."
            placeholder="Escribe a portería…"
          />
        )}
      </div>
    </div>
  );
};
