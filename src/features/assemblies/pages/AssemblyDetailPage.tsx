import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Vote,
  Plus,
  Lock,
  Play,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { assemblyService } from '../services/assemblyService';
import { pollService } from '../services/pollService';
import type { Assembly, Poll } from '../types/assembly.types';
import { LivePollCard } from '../components/LivePollCard';
import { CreatePollModal } from '../components/CreatePollModal';
import { ClosePollConfirmModal } from '../components/ClosePollConfirmModal';
import { AssemblyQRModal } from '../components/AssemblyQRModal';
import { AssemblyAttendanceList } from '../components/AssemblyAttendanceList';
import { notificationService } from '../../../services/notificationService';

export const AssemblyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [assembly, setAssembly] = useState<Assembly | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'votaciones' | 'asistencia'>('votaciones');
  const [closingPoll, setClosingPoll] = useState<Poll | null>(null);
  const [loadingClose, setLoadingClose] = useState(false);

  const loadData = useCallback(() => {
    if (!id) return;
    assemblyService.getAssemblyById(id).then((a) => {
      if (a) setAssembly({ ...a });
    });

    pollService.getPolls(id).then(setPolls);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!assembly) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <p className="font-bold text-slate-800 text-sm">Asamblea no encontrada</p>
        <button
          onClick={() => navigate('/admin/asambleas')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
        >
          Volver a Asambleas
        </button>
      </div>
    );
  }

  const livePoll = polls.find((p) => p.status === 'LIVE');
  const closedPolls = polls.filter((p) => p.status === 'CLOSED');
  const draftPolls = polls.filter((p) => p.status === 'DRAFT');

  const handlePublishDraft = async (pollId: string) => {
    await pollService.publishPoll(pollId);
    notificationService.showToast('Encuesta activada EN VIVO', 'success');
    loadData();
  };

  const handleConfirmClose = async () => {
    if (!closingPoll) return;
    try {
      setLoadingClose(true);
      await pollService.closePoll(closingPoll.id);
      notificationService.showToast('Votación cerrada exitosamente', 'success');
      setClosingPoll(null);
      loadData();
    } catch {
      notificationService.showToast('Error al cerrar votación', 'error');
    } finally {
      setLoadingClose(false);
    }
  };

  const handleToggleAssemblyStatus = async () => {
    const nextStatus = assembly.status === 'IN_PROGRESS' ? 'ENDED' : 'IN_PROGRESS';
    await assemblyService.updateAssemblyStatus(assembly.id, nextStatus);
    notificationService.showToast(
      `Asamblea marcada como ${nextStatus}`,
      nextStatus === 'ENDED' ? 'info' : 'success'
    );
    loadData();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top back button & controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate('/admin/asambleas')}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a listado de Asambleas
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleAssemblyStatus}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              assembly.status === 'IN_PROGRESS'
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}
          >
            {assembly.status === 'IN_PROGRESS' ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                Finalizar Sesión
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Reabrir Sesión
              </>
            )}
          </button>

          <button
            onClick={() => setIsQROpen(true)}
            className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            Proyectar QR Asistencia
          </button>

          <button
            onClick={() => setIsCreatePollOpen(true)}
            className="px-4 py-2 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nueva Pregunta / Encuesta
          </button>
        </div>
      </div>

      {/* Assembly Header Card */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
                  assembly.status === 'IN_PROGRESS'
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {assembly.status === 'IN_PROGRESS' && (
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                )}
                {assembly.status === 'IN_PROGRESS' ? '🔴 SESIÓN EN CURSO' : 'SESIÓN FINALIZADA'}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {assembly.type} • Modalidad {assembly.modality}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {assembly.title}
            </h1>
          </div>

          {/* Quorum Box */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">
              {assembly.quorumPercentage}%
            </div>
            <div className="text-xs">
              <p className="font-bold text-blue-950">Quórum Verificado</p>
              <p className="text-slate-500 text-[11px]">
                {assembly.registeredAttendees} de {assembly.totalProperties} propiedades
              </p>
            </div>
          </div>
        </div>

        {assembly.description && (
          <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
            {assembly.description}
          </p>
        )}
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('votaciones')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'votaciones'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Votaciones
        </button>
        <button
          onClick={() => setActiveTab('asistencia')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'asistencia'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Quórum y Asistencia
        </button>
      </div>

      {activeTab === 'votaciones' ? (
        <div className="space-y-6">
          {/* SECTION 1: LIVE POLL (If active) */}
          {livePoll ? (
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs uppercase font-black tracking-wider text-red-600 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  Votación Activa en la Asamblea
                </h2>
                <span className="text-xs text-slate-400 font-mono">ID: {livePoll.id}</span>
              </div>

              <LivePollCard
                poll={livePoll}
                onClosePoll={(p) => setClosingPoll(p)}
                onCreateNextPoll={() => setIsCreatePollOpen(true)}
              />
            </div>
          ) : (
            <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto shadow-2xs">
                <Vote className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">No hay ninguna votación abierta ahora mismo</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Formula el siguiente punto a debatir o lanza una pregunta preparada para que los residentes voten en tiempo real.
                </p>
              </div>
              <button
                onClick={() => setIsCreatePollOpen(true)}
                className="mt-4 px-5 py-2.5 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Crear Nueva Encuesta de Asamblea
              </button>
            </div>
          )}

          {/* SECTION 2: DRAFTS READY TO LAUNCH */}
          {draftPolls.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Preguntas en Borrador ({draftPolls.length})
              </h3>
              <div className="space-y-2">
                {draftPolls.map((dp) => (
                  <div
                    key={dp.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        Borrador ID: {dp.id.split('-')[0]}
                      </span>
                      <p className="font-bold text-slate-900 text-xs sm:text-sm mt-1">{dp.question}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {dp.options.length} opciones disponibles
                      </p>
                    </div>

                    <button
                      onClick={() => handlePublishDraft(dp.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Lanzar Votación
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: CLOSED POLLS / HISTORICAL RESULTS */}
          {closedPolls.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Puntos Votados y Acuerdos Aprobados ({closedPolls.length})
                </h3>
                <span className="text-xs text-slate-400">Resultados definitivos</span>
              </div>

              <div className="space-y-4">
                {closedPolls.map((cp) => (
                  <LivePollCard
                    key={cp.id}
                    poll={cp}
                    onClosePoll={() => {}}
                    onCreateNextPoll={() => setIsCreatePollOpen(true)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <AssemblyAttendanceList assembly={assembly} />
      )}
      
      <AssemblyQRModal
        assemblyId={assembly.id}
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
      />

      <CreatePollModal
        assembly={assembly}
        isOpen={isCreatePollOpen}
        onClose={() => setIsCreatePollOpen(false)}
        onSuccess={loadData}
      />

      <ClosePollConfirmModal
        poll={closingPoll}
        isOpen={!!closingPoll}
        onClose={() => setClosingPoll(null)}
        onConfirm={handleConfirmClose}
        loading={loadingClose}
      />
    </div>
  );
};

function draftsPollsLength(arr: Poll[]): number {
  return arr.length;
}

