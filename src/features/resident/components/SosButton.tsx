import React, { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import type { AlertType } from '../../../types';
import { panicService } from '../../../services/panicService';

const ALERT_OPTIONS: { type: AlertType; emoji: string; label: string; color: string }[] = [
  { type: 'MEDICAL', emoji: '🚑', label: 'Emergencia médica', color: 'bg-red-600 hover:bg-red-700' },
  { type: 'SECURITY', emoji: '🛡️', label: 'Seguridad', color: 'bg-orange-600 hover:bg-orange-700' },
  { type: 'FIRE', emoji: '🔥', label: 'Incendio', color: 'bg-amber-600 hover:bg-amber-700' },
  { type: 'OTHER', emoji: '⚠️', label: 'Otra emergencia', color: 'bg-gray-700 hover:bg-gray-800' },
];

type Step = 'idle' | 'select' | 'confirm' | 'sending' | 'sent';

export default function SosButton() {
  const [step, setStep] = useState<Step>('idle');
  const [selected, setSelected] = useState<typeof ALERT_OPTIONS[0] | null>(null);
  const [notes, setNotes] = useState('');

  const reset = () => { setStep('idle'); setSelected(null); setNotes(''); };

  const handleSend = async () => {
    if (!selected) return;
    setStep('sending');
    try {
      await panicService.createAlert(selected.type, notes || undefined);
      setStep('sent');
      setTimeout(reset, 3000);
    } catch (err) {
      console.error(err);
      setStep('confirm'); // volver al confirm para reintentar
    }
  };

  return (
    <>
      {/* Botón SOS flotante */}
      {step === 'idle' && (
        <button
          onClick={() => setStep('select')}
          className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8 z-50 w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 shadow-lg shadow-red-600/30 flex flex-col items-center justify-center text-white transition-transform"
          aria-label="Botón de emergencia SOS"
        >
          <AlertTriangle className="h-6 w-6" />
          <span className="text-[10px] font-bold mt-0.5">SOS</span>
        </button>
      )}

      {/* Modal de selección */}
      {(step === 'select' || step === 'confirm' || step === 'sending' || step === 'sent') && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            {/* Header */}
            <div className="bg-red-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-bold">Alerta de Emergencia</span>
              </div>
              {step !== 'sending' && step !== 'sent' && (
                <button onClick={reset} className="text-white/80 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="p-4">
              {/* Paso 1: Seleccionar tipo */}
              {step === 'select' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <p className="text-sm text-gray-600 mb-3 font-medium">¿Qué tipo de emergencia presentas?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALERT_OPTIONS.map(opt => (
                      <button
                        key={opt.type}
                        onClick={() => { setSelected(opt); setStep('confirm'); }}
                        className={`${opt.color} text-white rounded-xl p-3 text-left transition-colors active:scale-95`}
                      >
                        <div className="text-2xl mb-1">{opt.emoji}</div>
                        <div className="text-sm font-semibold">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-gray-400 text-center">
                    Esta alerta notificará de inmediato al personal de portería.
                  </p>
                </div>
              )}

              {/* Paso 2: Confirmar */}
              {step === 'confirm' && selected && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">{selected.emoji}</div>
                    <p className="font-bold text-gray-900">{selected.label}</p>
                    <p className="text-sm text-red-600 mt-1">¿Confirmar envío de alerta?</p>
                  </div>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Describe brevemente la situación (opcional)"
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none h-20 mb-3 focus:outline-none focus:ring-2 focus:ring-red-400"
                    maxLength={500}
                  />
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
                    ⚠️ Esta alerta notifica al conjunto. No reemplaza el llamado a los servicios oficiales de emergencia (119, 123).
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep('select')}
                      className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl py-2.5 text-sm font-medium transition-colors"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleSend}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-bold shadow-md shadow-red-600/20 transition-all active:scale-95"
                    >
                      Enviar alerta
                    </button>
                  </div>
                </div>
              )}

              {/* Enviando */}
              {step === 'sending' && (
                <div className="text-center py-8 animate-in fade-in">
                  <Loader2 className="h-10 w-10 animate-spin text-red-600 mx-auto mb-3" />
                  <p className="font-medium text-gray-900">Enviando alerta de emergencia...</p>
                  <p className="text-sm text-gray-500 mt-1">Por favor espera.</p>
                </div>
              )}

              {/* Enviado */}
              {step === 'sent' && (
                <div className="text-center py-8 animate-in zoom-in-50 duration-300">
                  <div className="text-6xl mb-3">✅</div>
                  <p className="font-bold text-gray-900 text-lg">Alerta enviada con éxito</p>
                  <p className="text-sm text-gray-600 mt-2 px-4">
                    El personal de seguridad del conjunto ha sido notificado de tu emergencia.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
