import { useCallback, useEffect, useRef, useState } from 'react';
import { residentChatService, staffChatService } from './chatService';
import { useChatEvents } from './useChatEvents';

/**
 * Fase 3 — contador del menú.
 * - Residente: mensajes de portería sin leer (todas sus unidades).
 * - Portería: conversaciones que requieren atención: pendientes (sin responsable) y las propias con mensajes sin leer.
 * Se recalcula al montar, al llegar eventos del chat (agrupados) y al reconectar el SSE; sin polling.
 */
export function useChatUnread(role: string | undefined, userId: string | undefined): number {
  const [count, setCount] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabled = role === 'RESIDENT' || role === 'SECURITY';

  const refresh = useCallback(async () => {
    try {
      if (role === 'RESIDENT') {
        const list = await residentChatService.list();
        setCount(list.reduce((n, c) => n + (c.unread || 0), 0));
      } else if (role === 'SECURITY') {
        const page = await staffChatService.inbox('OPEN', '', 0, 50);
        setCount(page.content.filter((c) => c.status === 'PENDING' || (c.assignedToUserId === userId && c.unread > 0)).length);
      }
    } catch {
      // El contador es informativo: un error no interrumpe el portal.
    }
  }, [role, userId]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void refresh(), 800);
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled, refresh]);

  useChatEvents(() => enabled && schedule(), () => enabled && schedule());

  return enabled ? count : 0;
}
