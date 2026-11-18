import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { AlertCircle, Loader2, RotateCcw, Send } from 'lucide-react';
import { cn } from '../../utils/cn';
import { CHAT_MAX_LENGTH, type ChatAuthorRole, type ChatMessage } from './chatTypes';
import { formatChatTime, staffLabel } from './chatState';

interface Props {
  messages: ChatMessage[];
  /** Rol de quien mira: sus mensajes van a la derecha. */
  viewerRole: ChatAuthorRole;
  /** En portería: mostrar también el nombre en los mensajes propios. */
  showStaffNames?: boolean;
  hasMore: boolean;
  loading: boolean;
  loadingOlder: boolean;
  error?: string | null;
  sendError?: string | null;
  onLoadOlder: () => void;
  onSend: (text: string) => Promise<boolean>;
  onRetry: (clientMessageId: string) => void;
  /** Si no se puede escribir, motivo visible (y el campo queda deshabilitado). */
  disabledReason?: string | null;
  /** Aviso sobre el estado (p. ej. «cerrada: si escribes, se reabrirá»). */
  notice?: ReactNode;
  emptyText?: string;
  placeholder?: string;
}

/**
 * Fase 3 — hilo de chat (solo texto). Los mensajes se muestran como TEXTO (React escapa el contenido; nunca se
 * interpreta HTML) conservando los saltos de línea.
 */
export const ChatThread = ({
  messages, viewerRole, showStaffNames = false, hasMore, loading, loadingOlder, error, sendError, onLoadOlder, onSend,
  onRetry, disabledReason, notice, emptyText = 'Aún no hay mensajes.', placeholder = 'Escribe un mensaje…',
}: Props) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const prevCount = useRef(0);

  // Mantener la vista abajo al llegar mensajes nuevos (salvo que el usuario esté leyendo arriba).
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const grewAtEnd = messages.length > prevCount.current;
    prevCount.current = messages.length;
    if (grewAtEnd && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    stickToBottom.current = true;
  }, [loading]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const submit = async () => {
    const value = text.trim();
    if (!value || sending || disabledReason) return;
    setSending(true);
    stickToBottom.current = true;
    setText('');
    // Si falla, el mensaje queda en el hilo como «No enviado» con su botón de reintento.
    await onSend(value);
    setSending(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  };

  const remaining = CHAT_MAX_LENGTH - text.length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        ref={listRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2 bg-slate-50"
        data-testid="chat-messages"
        aria-live="polite"
      >
        {hasMore && (
          <div className="flex justify-center pb-1">
            <button
              type="button"
              onClick={onLoadOlder}
              disabled={loadingOlder}
              className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1 hover:bg-slate-100 disabled:opacity-60"
            >
              {loadingOlder ? 'Cargando…' : 'Cargar mensajes anteriores'}
            </button>
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center py-10 text-slate-400" data-testid="chat-loading">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {!loading && error && (
          <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {!loading && !error && messages.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-10" data-testid="chat-empty">{emptyText}</p>
        )}
        {messages.map((m) => {
          const mine = m.authorRole === viewerRole;
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')} data-testid="chat-message">
              <div
                className={cn(
                  'max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 py-2 shadow-xs',
                  mine ? 'bg-[#16345F] text-white rounded-br-md' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md',
                  m.localState === 'failed' && 'opacity-80 ring-2 ring-rose-300',
                )}
              >
                {!mine && (
                  <div className="text-[11px] font-bold text-slate-500 mb-0.5" data-testid="chat-message-author">
                    {m.authorRole === 'STAFF' ? staffLabel(m.authorName) : m.authorName}
                  </div>
                )}
                {mine && showStaffNames && viewerRole === 'STAFF' && (
                  <div className="text-[11px] font-bold text-white/70 mb-0.5">{m.authorName}</div>
                )}
                <p className="text-sm whitespace-pre-wrap break-words" data-testid="chat-message-body">{m.body}</p>
                <div className={cn('mt-1 text-[10px] flex items-center gap-1 justify-end', mine ? 'text-white/70' : 'text-slate-400')}>
                  {m.localState === 'sending' && <><Loader2 className="w-3 h-3 animate-spin" /> Enviando…</>}
                  {m.localState === 'failed' && (
                    <button
                      type="button"
                      onClick={() => m.clientMessageId && onRetry(m.clientMessageId)}
                      className="inline-flex items-center gap-1 font-bold text-rose-200 hover:text-white underline"
                      data-testid="chat-retry"
                    >
                      <RotateCcw className="w-3 h-3" /> No enviado · Reintentar
                    </button>
                  )}
                  {!m.localState && <time dateTime={m.createdAt}>{formatChatTime(m.createdAt)}</time>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-200 bg-white p-2 sm:p-3">
        {notice && <div className="mb-2 text-xs text-slate-600 bg-slate-100 rounded-lg px-3 py-2">{notice}</div>}
        {sendError && (
          <div className="mb-2 flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" role="alert">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {sendError}
          </div>
        )}
        {disabledReason ? (
          <p className="text-xs text-slate-500 text-center py-2" data-testid="chat-disabled">{disabledReason}</p>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, CHAT_MAX_LENGTH))}
                onKeyDown={onKeyDown}
                rows={1}
                maxLength={CHAT_MAX_LENGTH}
                placeholder={placeholder}
                aria-label="Mensaje"
                className="w-full resize-none max-h-32 min-h-[44px] rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16345F]/30 focus:border-[#16345F]"
                data-testid="chat-input"
              />
              {remaining < 100 && (
                <div className={cn('text-[10px] text-right', remaining <= 0 ? 'text-rose-600' : 'text-slate-400')}>
                  {remaining} caracteres disponibles
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!text.trim() || sending}
              aria-label="Enviar"
              className="h-11 w-11 shrink-0 rounded-xl bg-[#16345F] text-white flex items-center justify-center disabled:opacity-40 hover:bg-blue-700"
              data-testid="chat-send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
