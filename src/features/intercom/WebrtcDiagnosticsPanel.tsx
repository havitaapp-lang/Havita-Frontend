/**
 * P8-A5 — Panel de diagnóstico WebRTC. Solo se monta con VITE_INTERCOM_WEBRTC_DIAGNOSTICS = 'true'.
 *
 * Es de solo lectura: muestra el par de candidatos y los tiempos, y permite COPIAR el resumen sanitizado (sin IP,
 * tokens ni SDP), para enviarlo desde un móvil sin consola de desarrollador. No interviene en la llamada.
 */
import React, { useEffect, useState } from 'react';
import { summarizeIntercomTrace, type IntercomTrace } from './callMetrics';
import { summarizeWebrtcDiagnostics, type WebrtcDirectionSummary } from './webrtcDiagnostics';

const REFRESH_MS = 1000;

function diagnosticsExport(trace: IntercomTrace | null | undefined): string {
  if (!trace) return '{}';
  return JSON.stringify({ app: summarizeIntercomTrace(trace), network: summarizeWebrtcDiagnostics(trace) }, null, 2);
}

const describe = (label: string, d?: WebrtcDirectionSummary): string => {
  if (!d) return `${label}: —`;
  const l = d.selected?.local;
  const rmt = d.selected?.remote;
  const path = l ? `${l.candidateType ?? '?'}/${l.protocol ?? '?'}${l.relayProtocol ? `(${l.relayProtocol})` : ''} → ${rmt?.candidateType ?? '?'}` : 'sin par';
  const rtt = d.selected?.rttMs !== undefined ? ` · RTT ${d.selected.rttMs} ms` : '';
  const ice = d.iceMs !== undefined ? ` · ICE ${d.iceMs} ms` : '';
  return `${label}: ${path}${rtt}${ice}`;
};

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* se intenta la alternativa */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export const WebrtcDiagnosticsPanel: React.FC<{ trace: IntercomTrace | null }> = ({ trace }) => {
  const [, setTick] = useState(0);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const summary = summarizeWebrtcDiagnostics(trace);
  const i = summary?.intervals;

  return (
    <div data-testid="intercom-webrtc-diagnostics" className="mt-4 w-full text-left text-[10px] leading-snug text-slate-400 border-t border-slate-800 pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-300">Diagnóstico WebRTC</span>
        <button
          type="button"
          onClick={async () => setCopied((await copyText(diagnosticsExport(trace))) ? 'ok' : 'fail')}
          className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200"
        >
          {copied === 'ok' ? 'Copiado' : copied === 'fail' ? 'No se pudo copiar' : 'Copiar diagnóstico'}
        </button>
      </div>
      {summary ? (
        <ul className="mt-1 space-y-0.5 font-mono">
          <li>{describe('envío', summary.send)}</li>
          <li>{describe('recepción', summary.recv)}</li>
          <li>init {i?.sdkInit ?? '—'} · join→ICE {i?.joinStartToIceChecking ?? '—'} · join→medios {i?.joinStartToMediaConnected ?? '—'} ms</li>
          <li>join→1.er audio remoto {i?.joinStartToFirstRemoteAudioPacket ?? '—'} · →reproducción {i?.firstRemoteAudioPacketToPlayback ?? '—'} ms</li>
        </ul>
      ) : (
        <p className="mt-1">Sin datos todavía.</p>
      )}
      <details className="mt-1">
        <summary className="cursor-pointer">JSON</summary>
        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all select-all">{diagnosticsExport(trace)}</pre>
      </details>
    </div>
  );
};
