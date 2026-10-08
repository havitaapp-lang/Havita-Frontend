import { useState } from 'react';
import { X, HelpCircle, ListPlus, Settings2, CheckCircle2, Plus, Trash2, ChevronRight, ChevronLeft, Send, Eye } from 'lucide-react';
import type { Assembly } from '../types/assembly.types';
import { pollService } from '../services/pollService';
import { notificationService } from '../../../services/notificationService';
import { CharacterCounter } from '../../../components/ui/CharacterCounter';
import { FIELD_LIMITS } from '../../../validation/rules/limits';

interface CreatePollModalProps {
  assembly: Assembly;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  assembly,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Poll Form State
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>([
    'Sí, apruebo',
    'No apruebo',
    'Me abstengo',
  ]);
  const [newOptionText, setNewOptionText] = useState('');
  const [pollType, setPollType] = useState<'SINGLE_CHOICE' | 'MULTIPLE_CHOICE'>('SINGLE_CHOICE');
  const [showResultsToResidents, setShowResultsToResidents] = useState(true);
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState(15);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (!newOptionText.trim()) return;
    setOptions([...options, newOptionText.trim()]);
    setNewOptionText('');
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      notificationService.showToast('Una encuesta debe tener al menos 2 opciones', 'warning');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!question.trim()) {
        notificationService.showToast('Por favor escribe la pregunta de la votación', 'warning');
        return;
      }
    }
    if (step === 2) {
      if (options.length < 2) {
        notificationService.showToast('Debes configurar al menos 2 opciones', 'warning');
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await pollService.createPoll({
        assemblyId: assembly.id,
        assemblyTitle: assembly.title,
        question: question.trim(),
        type: pollType,
        options,
        showResultsToResidents,
        publishImmediately,
        durationMinutes,
      });

      notificationService.showToast(
        publishImmediately
          ? '¡Encuesta publicada EN VIVO! Los residentes ya pueden votar.'
          : 'Encuesta guardada como borrador.',
        'success'
      );
      onSuccess();
      onClose();
    } catch {
      notificationService.showToast('Error al procesar la encuesta', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Nueva Encuesta de Asamblea
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {assembly.title} · {assembly.totalProperties} propiedades convocadas
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Pregunta', icon: <HelpCircle className="w-3.5 h-3.5" /> },
              { num: 2, label: 'Opciones', icon: <ListPlus className="w-3.5 h-3.5" /> },
              { num: 3, label: 'Configuración', icon: <Settings2 className="w-3.5 h-3.5" /> },
              { num: 4, label: 'Confirmar', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
            ].map((st, i) => (
              <div key={st.num} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center transition-all ${
                    step === st.num
                      ? 'bg-[var(--tenant-primary)] text-white shadow-sm ring-2 ring-blue-100'
                      : step > st.num
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > st.num ? '✓' : st.num}
                </div>
                <span
                  className={`text-xs hidden sm:inline-block font-semibold ${
                    step === st.num ? 'text-slate-900 font-bold' : 'text-slate-400'
                  }`}
                >
                  {st.label}
                </span>
                {i < 3 && <div className="w-4 sm:w-8 h-0.5 bg-slate-200 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* STEP 1: Question */}
          {step === 1 && (
            <div className="space-y-3.5 animate-fade-in">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="poll-question" className="block font-bold text-slate-800 text-sm">
                    Pregunta a Someter a Votación <span className="text-rose-500">*</span>
                  </label>
                  <CharacterCounter current={question.length} max={FIELD_LIMITS.POLL_QUESTION_MAX_LENGTH} alwaysVisible />
                </div>
                <textarea
                  id="poll-question"
                  rows={3}
                  maxLength={FIELD_LIMITS.POLL_QUESTION_MAX_LENGTH}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ej. ¿Aprueba el presupuesto de administración e inversión para el período 2027?"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold text-sm focus:bg-white focus:border-blue-500 focus:outline-none leading-relaxed"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Redacta la pregunta de forma clara, directa e inequívoca para los copropietarios.
                </p>
              </div>

              {/* Suggestions shortcuts */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Plantillas frecuentes para asamblea:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '¿Aprueba el presupuesto de administración para 2027?',
                    '¿Aprueba los estados financieros con corte a 31 de diciembre?',
                    '¿Autoriza la ejecución de obras de impermeabilización de cubiertas?',
                    '¿Aprueba el nombramiento del nuevo Consejo de Administración?',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuestion(preset)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-xl text-[11px] text-left transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Options */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Opciones de Respuesta ({options.length})
                </label>
                <p className="text-[11px] text-slate-500 mb-3">
                  Los residentes podrán seleccionar entre estas alternativas durante la votación.
                </p>

                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <span className="w-5 h-5 rounded-lg bg-white border border-slate-300 font-bold text-[10px] text-slate-600 flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        maxLength={FIELD_LIMITS.POLL_OPTION_MAX_LENGTH}
                        value={opt}
                        onChange={(e) => {
                          const updated = [...options];
                          updated[idx] = e.target.value;
                          setOptions(updated);
                        }}
                        className="flex-1 bg-transparent text-slate-900 font-semibold focus:outline-none text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-1 hover:bg-slate-200 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar opción"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add option bar */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.POLL_OPTION_MAX_LENGTH}
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                  placeholder="Escribir nueva opción..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Opción
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Configuration */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mecanismo de Selección</label>
                  <select
                    value={pollType}
                    onChange={(e) => setPollType(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="SINGLE_CHOICE">Opción Única (1 sola respuesta)</option>
                    <option value="MULTIPLE_CHOICE">Opción Múltiple</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duración Estimada</label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value={5}>5 minutos (Rápida)</option>
                    <option value={10}>10 minutos</option>
                    <option value={15}>15 minutos (Recomendada)</option>
                    <option value={30}>30 minutos</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">
                      Mostrar Resultados en Vivo a Residentes
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Los votantes verán las barras de porcentajes inmediatamente después de emitir su voto.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                    <input
                      type="checkbox"
                      checked={showResultsToResidents}
                      onChange={(e) => setShowResultsToResidents(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--tenant-primary)]" />
                  </label>
                </div>

                <div className="p-3 bg-red-50/60 rounded-2xl border border-red-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-red-950 block text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      Publicar Inmediatamente en Vivo (LIVE)
                    </span>
                    <span className="text-[11px] text-red-800">
                      Al confirmar, la encuesta se abrirá en las pantallas de todos los residentes de la asamblea.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                    <input
                      type="checkbox"
                      checked={publishImmediately}
                      onChange={(e) => setPublishImmediately(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Confirmation Preview */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Vista Previa de la Encuesta
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      publishImmediately
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {publishImmediately ? '🔴 EN VIVO' : 'BORRADOR'}
                  </span>
                </div>

                <h3 className="font-black text-slate-900 text-sm leading-snug">
                  {question}
                </h3>

                <div className="space-y-1.5 pt-1">
                  {options.map((opt, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs"
                    >
                      <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center shrink-0 text-[10px] text-slate-400">
                        {i + 1}
                      </span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Asamblea: {assembly.title}</span>
                  <span>Ver resultados: {showResultsToResidents ? 'Sí' : 'No'}</span>
                </div>
              </div>

              {publishImmediately ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-900 flex items-center gap-2">
                  <Send className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    Esta pregunta aparecerá inmediatamente en el portal y celulares de los residentes convocados.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Se guardará como borrador para ser lanzada manualmente en el momento oportuno.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-slate-600 hover:bg-slate-200/60 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Atrás
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:bg-slate-200/60 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              Siguiente
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={`px-6 py-2.5 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                publishImmediately
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                  : 'bg-[var(--tenant-primary)] hover:bg-blue-600'
              }`}
            >
              {loading
                ? 'Procesando...'
                : publishImmediately
                ? 'Publicar Encuesta EN VIVO'
                : 'Guardar Borrador'}
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
