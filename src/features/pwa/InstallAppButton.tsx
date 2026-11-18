import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import {
  Download, Share, PlusSquare, MoreVertical, MoreHorizontal, X, Smartphone, ArrowDown, ArrowUp, Copy, Check, Compass,
} from 'lucide-react';
import {
  detectInstallBrowser, detectInstallPlatform, installPromptStore, isIpad, isRunningStandalone,
} from './installPlatform';

/**
 * «Instalar aplicación» (solo móviles y tablets, nunca dentro de la app instalada).
 *
 * - Android (Chrome, Edge, Samsung): abre directamente el aviso nativo de instalación.
 * - iPhone/iPad en Safari: Apple no permite instalar desde un botón. Se muestran los pasos y una flecha animada que
 *   señala el botón Compartir de Safari (abajo en iPhone, arriba a la derecha en iPad).
 * - Otro navegador (Chrome/Firefox en iOS…): pasos adaptados y recomendación de Safari/Chrome.
 * - Navegador interno (WhatsApp, Instagram, Facebook…): no se puede instalar; se pide abrir el enlace en el navegador
 *   del sistema, con botón para copiar el enlace.
 */
export const InstallAppButton = ({ className = '' }: { className?: string }) => {
  const [env] = useState(() => {
    const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
    const touch = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints || 0;
    const platform = detectInstallPlatform(ua, touch);
    return {
      platform,
      browser: detectInstallBrowser(ua, platform),
      ipad: isIpad(ua, touch),
    };
  });
  const [standalone, setStandalone] = useState(() => isRunningStandalone());
  const [showSteps, setShowSteps] = useState(false);
  const store = useSyncExternalStore(installPromptStore.subscribe, installPromptStore.get, installPromptStore.get);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(display-mode: standalone)');
    const onChange = () => setStandalone(isRunningStandalone());
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  if (env.platform === 'desktop' || standalone || store.installed) return null;

  const onClick = async () => {
    if (env.platform === 'android' && env.browser !== 'in-app' && store.deferredPrompt) {
      const r = await installPromptStore.prompt();
      if (r !== 'unavailable') return;
    }
    setShowSteps(true);
  };

  const iosSafari = env.platform === 'ios' && env.browser === 'safari';

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        data-testid="install-app-button"
        className={`w-full h-12 rounded-xl text-sm font-bold flex justify-center items-center gap-2 border-2 border-[#16345F] text-[#16345F] bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>Instalar aplicación</span>
      </button>

      {showSteps && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-steps-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4"
          onClick={() => setShowSteps(false)}
        >
          {iosSafari && <ShareArrow ipad={env.ipad} />}

          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#16345F]" />
                <h2 id="install-steps-title" className="text-base font-black text-slate-900">
                  Instalar Havita
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSteps(false)}
                aria-label="Cerrar"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {env.browser === 'in-app' ? (
              <InAppSteps platform={env.platform} />
            ) : env.platform === 'ios' ? (
              <IosSteps ipad={env.ipad} otherBrowser={env.browser === 'other'} />
            ) : (
              <AndroidSteps otherBrowser={env.browser === 'other'} />
            )}

            <button
              type="button"
              onClick={() => setShowSteps(false)}
              className="mt-5 w-full h-11 rounded-xl text-sm font-bold text-white bg-[#16345F] hover:bg-blue-700"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const Step = ({ n, children }: { n: number; children: ReactNode }) => (
  <li className="flex items-center gap-3">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold">{n}</span>
    <span>{children}</span>
  </li>
);

const ShareIcon = () => <Share className="inline w-4 h-4 -mt-1 text-[#007AFF]" aria-label="icono Compartir" />;

/** Flecha animada hacia el botón Compartir de Safari: barra inferior (iPhone) o arriba a la derecha (iPad). */
const ShareArrow = ({ ipad }: { ipad: boolean }) => (
  <div
    data-testid={ipad ? 'share-arrow-top' : 'share-arrow-bottom'}
    aria-hidden="true"
    className={`pointer-events-none fixed z-[101] flex flex-col items-center gap-1 text-white ${
      ipad ? 'top-2 right-24' : 'bottom-2 left-1/2 -translate-x-1/2'
    }`}
  >
    {ipad && <ArrowUp className="w-10 h-10 animate-bounce drop-shadow-lg" strokeWidth={3} />}
    <span className="rounded-full bg-[#007AFF] px-3 py-1 text-xs font-bold shadow-lg flex items-center gap-1">
      <Share className="w-3.5 h-3.5" /> Compartir
    </span>
    {!ipad && <ArrowDown className="w-10 h-10 animate-bounce drop-shadow-lg" strokeWidth={3} />}
  </div>
);

const IosSteps = ({ ipad, otherBrowser }: { ipad: boolean; otherBrowser: boolean }) => (
  <>
    <ol className="space-y-3 text-sm text-slate-700" data-testid={otherBrowser ? 'install-steps-ios-other' : 'install-steps-ios'}>
      {otherBrowser ? (
        <Step n={1}>
          Toca <strong>Compartir</strong> <ShareIcon /> en la barra de direcciones (o en el menú{' '}
          <MoreHorizontal className="inline w-4 h-4 -mt-1" aria-label="icono más" /> del navegador).
        </Step>
      ) : (
        <Step n={1}>
          Toca <strong>Compartir</strong> <ShareIcon /> {ipad ? 'arriba a la derecha' : 'en la barra de abajo'}, como
          señala la flecha. Si no lo ves, toca <MoreHorizontal className="inline w-4 h-4 -mt-1" aria-label="icono más" />{' '}
          y luego <strong>Compartir</strong>.
        </Step>
      )}
      <Step n={2}>
        Elige <strong>Agregar a inicio</strong> <PlusSquare className="inline w-4 h-4 -mt-1" aria-hidden="true" /> (desliza
        hacia abajo si no aparece) y toca <strong>Agregar</strong>.
      </Step>
      <Step n={3}>Abre Havita desde el icono de tu pantalla de inicio.</Step>
    </ol>
    {otherBrowser && (
      <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800" data-testid="install-recommend-safari">
        Si no aparece «Agregar a inicio», abre esta página en <strong>Safari</strong>.
        <CopyLinkButton />
      </p>
    )}
  </>
);

const AndroidSteps = ({ otherBrowser }: { otherBrowser: boolean }) => (
  <>
    <ol className="space-y-3 text-sm text-slate-700" data-testid="install-steps-android">
      <Step n={1}>
        Toca el menú <MoreVertical className="inline w-4 h-4 -mt-1" aria-label="icono menú" /> del navegador.
      </Step>
      <Step n={2}>
        Elige <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla principal</strong>.
      </Step>
      <Step n={3}>Abre Havita desde el icono de tu pantalla de inicio.</Step>
    </ol>
    {otherBrowser && (
      <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800" data-testid="install-recommend-chrome">
        Si no aparece la opción, abre esta página en <strong>Chrome</strong>.
        <CopyLinkButton />
      </p>
    )}
  </>
);

/** Navegador interno de otra app: no se puede instalar desde aquí. */
const InAppSteps = ({ platform }: { platform: string }) => {
  const browserName = platform === 'ios' ? 'Safari' : 'Chrome';
  return (
    <div className="space-y-3 text-sm text-slate-700" data-testid="install-steps-in-app">
      <p>
        Estás viendo Havita dentro de otra aplicación (WhatsApp, Instagram…), que no permite instalarla. Ábrela en{' '}
        <strong>{browserName}</strong>:
      </p>
      <ol className="space-y-3">
        <Step n={1}>
          Toca el menú <MoreHorizontal className="inline w-4 h-4 -mt-1" aria-label="icono más" /> o{' '}
          <Compass className="inline w-4 h-4 -mt-1" aria-hidden="true" /> y elige{' '}
          <strong>Abrir en {browserName}</strong> (o «Abrir en el navegador»).
        </Step>
        <Step n={2}>
          Si no existe esa opción, copia el enlace y pégalo en {browserName}.
        </Step>
      </ol>
      <CopyLinkButton />
    </div>
  );
};

const CopyLinkButton = () => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Respaldo para navegadores sin portapapeles asíncrono.
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* sin portapapeles */ }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      data-testid="install-copy-link"
      className="mt-2 w-full h-10 rounded-xl text-sm font-bold flex justify-center items-center gap-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Enlace copiado' : 'Copiar enlace'}
    </button>
  );
};
