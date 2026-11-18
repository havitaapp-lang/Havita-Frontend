import { useEffect, useState } from 'react';
import { BellRing, BellOff, Loader2 } from 'lucide-react';
import { pushNotificationService } from '../../services/pushNotificationService';

type State = 'hidden' | 'prompt' | 'denied' | 'busy';

const DISMISS_KEY = 'havita:chat-push-prompt-dismissed';

/**
 * Fase 3 — si este dispositivo no tiene activadas las notificaciones, el chat lo dice y permite activarlas en un toque
 * (el permiso solo puede pedirse con un gesto del usuario; en iPhone, dentro de la app instalada). Sin esto, un móvil
 * recién instalado o que cerró sesión no recibe avisos con la pantalla bloqueada y nadie lo nota.
 */
export const ChatPushPrompt = ({ who }: { who: 'resident' | 'staff' }) => {
  const [state, setState] = useState<State>('hidden');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pushNotificationService.isSupported()) return;
      try {
        if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
      } catch { /* sin almacenamiento */ }
      const permission = pushNotificationService.getPermission();
      if (permission === 'denied') {
        if (!cancelled) setState('denied');
        return;
      }
      const subscribed = permission === 'granted' && (await pushNotificationService.isBrowserSubscribed());
      if (!cancelled && !subscribed) setState('prompt');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'hidden') return null;

  const enable = async () => {
    setState('busy');
    setError(null);
    const res = await pushNotificationService.subscribe();
    if (res.success) {
      setState('hidden');
    } else {
      setError(res.error || 'No se pudieron activar las notificaciones.');
      setState(pushNotificationService.getPermission() === 'denied' ? 'denied' : 'prompt');
    }
  };

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* sin almacenamiento */ }
    setState('hidden');
  };

  const text = who === 'resident'
    ? 'Activa las notificaciones para enterarte de las respuestas de portería aunque tengas el celular bloqueado.'
    : 'Activa las notificaciones para enterarte de los mensajes de los residentes aunque la app esté en segundo plano.';

  return (
    <div className="mb-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900" data-testid="chat-push-prompt" role="status">
      {state === 'denied' ? (
        <div className="flex items-start gap-2">
          <BellOff className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Las notificaciones están bloqueadas en este dispositivo. Para recibir avisos del chat, permítelas en los
            ajustes del teléfono (Ajustes → Notificaciones → Havita).
          </span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-start gap-2 flex-1">
            <BellRing className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{text}</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void enable()}
              disabled={state === 'busy'}
              className="h-8 px-3 rounded-lg bg-[#16345F] text-white font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
              data-testid="chat-push-enable"
            >
              {state === 'busy' && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Activar
            </button>
            <button type="button" onClick={dismiss} className="h-8 px-2 rounded-lg font-semibold text-blue-800 hover:bg-blue-100">
              Ahora no
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-rose-700">{error}</p>}
    </div>
  );
};
