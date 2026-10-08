import { useState } from 'react';
import { X, Calendar, Building, Plus } from 'lucide-react';
import type { AssemblyType, AssemblyModality } from '../types/assembly.types';
import { assemblyService } from '../services/assemblyService';
import { notificationService } from '../../../services/notificationService';
import { CharacterCounter } from '../../../components/ui/CharacterCounter';
import { FIELD_LIMITS } from '../../../validation/rules/limits';

interface CreateAssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateAssemblyModal: React.FC<CreateAssemblyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AssemblyType>('ORDINARIA');
  const [modality, setModality] = useState<AssemblyModality>('MIXTA');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('18:00');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      notificationService.showToast('Por favor escribe el título de la asamblea', 'warning');
      return;
    }

    try {
      setLoading(true);
      await assemblyService.createAssembly({
        title: title.trim(),
        type,
        modality,
        date,
        time,
        description: description.trim() || undefined,
      } as any);

      notificationService.showToast(`Asamblea "${title}" creada e iniciada`, 'success');
      onSuccess();
      onClose();
    } catch {
      notificationService.showToast('Error al crear asamblea', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--tenant-primary)]" />
              Crear Nueva Asamblea de Copropietarios
            </h3>
            <p className="text-xs text-slate-500">
              Programa o inicia de inmediato una sesión de asamblea para votaciones en vivo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="assembly-title" className="block font-bold text-slate-700">
                Nombre / Título de la Asamblea <span className="text-rose-500">*</span>
              </label>
              <CharacterCounter current={title.length} max={FIELD_LIMITS.TITLE_MAX_LENGTH} />
            </div>
            <input
              id="assembly-title"
              type="text"
              maxLength={FIELD_LIMITS.TITLE_MAX_LENGTH}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Asamblea General Ordinaria 2026"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:border-blue-500 focus:outline-none"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="assembly-type" className="block font-bold text-slate-700 mb-1">Tipo de Asamblea</label>
              <select
                id="assembly-type"
                value={type}
                onChange={(e) => setType(e.target.value as AssemblyType)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:border-blue-500 focus:outline-none"
              >
                <option value="ORDINARIA">Ordinaria (Anual de Presupuesto)</option>
                <option value="EXTRAORDINARIA">Extraordinaria (Cuota o Asunto Específico)</option>
              </select>
            </div>

            <div>
              <label htmlFor="assembly-modality" className="block font-bold text-slate-700 mb-1">Modalidad</label>
              <select
                id="assembly-modality"
                value={modality}
                onChange={(e) => setModality(e.target.value as AssemblyModality)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:border-blue-500 focus:outline-none"
              >
                <option value="MIXTA">Mixta (Presencial + Havita)</option>
                <option value="VIRTUAL">Virtual 100%</option>
                <option value="PRESENCIAL">Presencial con votación digital</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="assembly-date" className="block font-bold text-slate-700 mb-1">Fecha de Sesión</label>
              <input
                id="assembly-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="assembly-time" className="block font-bold text-slate-700 mb-1">Hora de Convocatoria</label>
              <input
                id="assembly-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="assembly-desc" className="block font-bold text-slate-700">Orden del Día / Descripción</label>
              <CharacterCounter current={description.length} max={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH} alwaysVisible />
            </div>
            <textarea
              id="assembly-desc"
              rows={3}
              maxLength={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Presentación de estados financieros, aprobación de presupuesto 2027 y elección de nuevo consejo..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center gap-2.5 text-blue-900 text-[11px]">
            <Building className="w-4 h-4 text-[var(--tenant-primary)] shrink-0" />
            <span>
              La asamblea se iniciará en estado <strong>EN CURSO</strong> permitiendo emitir preguntas y encuestas en tiempo real para las 428 propiedades de la copropiedad.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Creando...' : 'Crear y Abrir Asamblea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
