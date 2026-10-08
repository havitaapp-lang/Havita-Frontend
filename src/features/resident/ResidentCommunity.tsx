import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { FileText, Download, Calendar, Vote, CheckCircle2, Eye } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ResidentLivePollBanner } from './components/ResidentLivePollBanner';
import { ResidentLiveAttendanceBanner } from './components/ResidentLiveAttendanceBanner';
import { pollService } from '../assemblies/services/pollService';
import type { Poll } from '../assemblies/types/assembly.types';
import { ResidentVoteModal } from './components/ResidentVoteModal';
import { notificationService } from '../../services/notificationService';
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal';

export const ResidentCommunity = () => {
  const { user, userProperties } = useAuth();
  const { communications, documents, incrementDocumentDownload } = useData();
  const [tab, setTab] = useState<'Comunicados' | 'Documentos' | 'Votaciones'>('Comunicados');
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{doc: any, objectUrl: string | null} | null>(null);

  const propertyUnit = user?.propertyUnit || 'Mi Apartamento';
  const residentName = user?.name || 'Residente';
  
  // A resident could be Propietario or Arrendatario. We check their resident properties.
  const isPropietario = userProperties.some(p => p.type?.toLowerCase().includes('propietario'));
  const isArrendatario = userProperties.some(p => p.type?.toLowerCase().includes('arrendatario') || p.type?.toLowerCase().includes('inquilino'));

  const publishedComms = communications.filter((c) => {
    if (c.status !== 'PUBLISHED') return false;
    
    const aud = c.audience || 'Todos';
    if (aud === 'Todos' || aud === 'General') {
      return true;
    }
    
    if (aud === 'Propietarios' && isPropietario) return true;
    if (aud === 'Arrendatarios' && isArrendatario) return true;
    if (aud === 'Propietarios' && !isPropietario) return false;
    if (aud === 'Arrendatarios' && !isArrendatario) return false;
    
    // It's a specific selection (Visual)
    const targets = aud.split(',').map(s => s.trim());
    return targets.some(target => propertyUnit.includes(target));
  });

  useEffect(() => {
    pollService.getPolls().then(setPolls);
  }, []);

  const handlePreview = async (doc: any) => {
    if (doc.fileUrl) {
      try {
        setPreviewDoc({ doc, objectUrl: null }); // Open modal in loading state
        const urlObj = new URL(doc.fileUrl, window.location.origin);
        let endpoint = urlObj.pathname + urlObj.search;
        if (endpoint.startsWith('/api/v1')) {
          endpoint = endpoint.replace('/api/v1', '');
        }
        
        await import('../../api/apiClient').then(async ({ apiClient }) => {
          const url = await apiClient.getPreviewUrl(endpoint);
          setPreviewDoc({ doc, objectUrl: url });
        });
      } catch {
        notificationService.showError('Error', 'No se pudo cargar la vista previa.');
        setPreviewDoc(null);
      }
    }
  };

  const handleDownload = async (doc: any) => {
    incrementDocumentDownload(doc.id);
    if (doc.fileUrl) {
      try {
        notificationService.showToast(`Descargando "${doc.title}"...`, 'info');
        // Extract endpoint from full URL
        const urlObj = new URL(doc.fileUrl, window.location.origin);
        let endpoint = urlObj.pathname + urlObj.search;
        // if the url is already absolute API path, use it, otherwise clean it
        if (endpoint.startsWith('/api/v1')) {
          endpoint = endpoint.replace('/api/v1', '');
        }
        await import('../../api/apiClient').then(({ apiClient }) => {
          apiClient.downloadFile(endpoint, `${doc.title}.pdf`);
        });
      } catch {
        notificationService.showError('Error', 'No se pudo descargar el archivo.');
      }
    } else {
      notificationService.showToast(`Descargando "${doc.title}"`, 'success');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Comunidad, Asambleas y Circulares</h2>
        <p className="text-slate-500 text-xs">Mantente informado sobre noticias, votaciones de asamblea y reglamentos oficiales.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setTab('Comunicados')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tab === 'Comunicados'
              ? 'bg-[var(--tenant-primary)] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          Comunicados ({publishedComms.length})
        </button>
        <button
          onClick={() => setTab('Documentos')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tab === 'Documentos'
              ? 'bg-[var(--tenant-primary)] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          Reglamentos y Actas ({documents.length})
        </button>
        <button
          onClick={() => setTab('Votaciones')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'Votaciones'
              ? 'bg-[var(--tenant-primary)] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Vote className="w-3.5 h-3.5" />
          Asambleas & Votos ({polls.length})
        </button>
      </div>

      {/* Tab 1: Communications Feed */}
      {tab === 'Comunicados' && (
        <div className="space-y-3">
          {publishedComms.map((comm) => (
            <Card key={comm.id} className="p-4 rounded-2xl border border-slate-200/80 shadow-xs bg-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                  <span className="font-bold text-[var(--tenant-primary)] bg-blue-50 px-2 py-0.5 rounded">
                    {comm.category || 'General'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {comm.createdAt}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">{comm.title}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{comm.content}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span>{comm.authorName}</span>
                <span className="font-semibold text-slate-600">Para: {comm.audience}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 2: Documents Feed */}
      {tab === 'Documentos' && (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-4 rounded-2xl border border-slate-200/80 shadow-xs bg-white flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[var(--tenant-primary)] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{doc.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{doc.category} · {doc.fileType} ({doc.fileSize})</p>
                  {doc.description && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{doc.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handlePreview(doc)}
                  className="w-9 h-9 rounded-xl bg-blue-50 text-[var(--tenant-primary)] hover:bg-[var(--tenant-primary)] hover:text-white flex items-center justify-center transition-colors shadow-xs active:scale-95 cursor-pointer"
                  title="Previsualizar"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDownload(doc)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shadow-xs active:scale-95 cursor-pointer"
                  title="Descargar"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 3: Asambleas & Votaciones Feed */}
      {tab === 'Votaciones' && (
        <div className="space-y-4">
          <ResidentLiveAttendanceBanner />
          <ResidentLivePollBanner />

          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Historial de Preguntas y Acuerdos de Asamblea
            </h3>

            {polls.map((p) => {
              const hasVoted = pollService.hasPropertyVoted(p.id, propertyUnit);
              const isLive = p.status === 'LIVE';

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPoll(p)}
                  className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isLive
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isLive ? '🔴 EN VIVO' : 'CERRADA'}
                    </span>
                    <span className="text-[11px] text-slate-400">{p.createdAt}</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{p.question}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {p.assemblyTitle} · {p.totalVotes} votos registrados ({p.participationRate}%)
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    {hasVoted ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Ya emitiste tu voto
                      </span>
                    ) : isLive ? (
                      <span className="text-red-600 font-bold">¡Votación abierta ahora!</span>
                    ) : (
                      <span className="text-slate-400">Votación concluida</span>
                    )}

                    <span className="text-[var(--tenant-primary)] font-bold">
                      {isLive && !hasVoted ? 'Votar ahora →' : 'Ver resultados →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Poll Modal */}
      {selectedPoll && (
        <ResidentVoteModal
          poll={selectedPoll}
          isOpen={!!selectedPoll}
          onClose={() => setSelectedPoll(null)}
          propertyUnit={propertyUnit}
          residentName={residentName}
        />
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => {
          if (previewDoc?.objectUrl) {
            window.URL.revokeObjectURL(previewDoc.objectUrl);
          }
          setPreviewDoc(null);
        }}
        title={previewDoc?.doc.title || ''}
        fileUrl={previewDoc?.objectUrl || null}
        onDownload={() => {
          if (previewDoc) {
            handleDownload(previewDoc.doc);
          }
        }}
      />
    </div>
  );
};
