import { Lock } from 'lucide-react';
import type { Poll } from '../types/assembly.types';

interface ClosePollConfirmModalProps {
  poll: Poll | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const ClosePollConfirmModal: React.FC<ClosePollConfirmModalProps> = ({
  poll,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) => {
  if (!isOpen || !poll) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">
              ¿Cerrar votación de esta encuesta?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Al cerrar la pregunta, se detendrá el ingreso de votos en tiempo real y los residentes ya no podrán votar ni modificar su elección.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <p className="font-bold text-slate-800 leading-tight">"{poll.question}"</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Votos actuales: <strong className="text-blue-600">{poll.totalVotes}</strong> de {poll.totalEligible} propiedades ({poll.participationRate}%)
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              {loading ? 'Cerrando...' : 'Confirmar y Cerrar Votación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
