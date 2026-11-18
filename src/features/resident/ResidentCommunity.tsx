import { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { FileText, Download, Calendar, Vote, Eye, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveUnit } from '../../hooks/useActiveUnit';
import { audienceMatchesUnit } from './unit/audience';
import { ResidentLivePollBanner } from './components/ResidentLivePollBanner';
import { ResidentLiveAttendanceBanner } from './components/ResidentLiveAttendanceBanner';
import { pollService } from '../assemblies/services/pollService';
import { livePollService } from '../assemblies/services/livePollService';
import type { Poll } from '../assemblies/types/assembly.types';
import { ResidentVoteModal } from './components/ResidentVoteModal';
import { ResidentPollCardFooter } from './components/ResidentPollVoteStatus';
import { useQueryClient } from '@tanstack/react-query';
import { myVotingUnitsKey } from '../assemblies/services/pollService';
import { notificationService } from '../../services/notificationService';
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal';
import { formatDate } from '../../utils/formatters';

const ITEMS_PER_PAGE = 5;

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  itemName: string;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemName,
}) => {
  if (totalItems === 0) return null;

  const startIdx = (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="pt-3 mt-1 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
      <div>
        Mostrando <span className="font-semibold text-slate-700">{startIdx}</span> a <span className="font-semibold text-slate-700">{endIdx}</span> de <span className="font-semibold text-slate-700">{totalItems}</span> {itemName}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all shadow-2xs font-semibold cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          <div className="flex items-center gap-1">
            {pages.map((p) => {
              if (totalPages > 7) {
                if (p !== 1 && p !== totalPages && Math.abs(p - currentPage) > 1) {
                  if (p === 2 || p === totalPages - 1) {
                    return <span key={p} className="px-1 text-slate-400 select-none">...</span>;
                  }
                  return null;
                }
              }

              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`w-7 h-7 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 shadow-2xs'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all shadow-2xs font-semibold cursor-pointer"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export const ResidentCommunity = () => {
  const { user } = useAuth();
  // Fase 2 / E2: única fuente de unidad. Las reglas de votación no cambian aquí (E3).
  const { units: userProperties, activeUnitId: activePropertyId, activeUnit, activeLabel } = useActiveUnit();
  const queryClient = useQueryClient();
  const { communications, documents, incrementDocumentDownload } = useData();
  const [tab, setTab] = useState<'Comunicados' | 'Documentos' | 'Votaciones'>('Comunicados');
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{doc: any, objectUrl: string | null} | null>(null);
  const [expandedCommIds, setExpandedCommIds] = useState<Record<string, boolean>>({});

  const toggleExpandComm = (id: string) => {
    setExpandedCommIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Texto de la unidad activa (etiqueta y número) para mostrarla y para el filtro visual de audiencia por torre.
  const propertyUnit = [activeLabel, activeUnit?.number].filter(Boolean).join(' ') || 'Mi unidad';
  const residentName = user?.name || 'Residente';
  
  // A resident could be Propietario or Arrendatario. We check their resident properties.
  const relationsOf = (p: any): string[] => (p.relations?.length ? p.relations : [p.type]).filter(Boolean).map((t: string) => t.toLowerCase());
  const isPropietario = userProperties.some(p => relationsOf(p).some(t => t.includes('propietario')));
  const isArrendatario = userProperties.some(p => relationsOf(p).some(t => t.includes('arrendatario') || t.includes('inquilino')));

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
    
    // It's a specific selection (Visual): comparación exacta con la unidad activa (Fase 2 / E3).
    return audienceMatchesUnit(aud, activeUnit);
  });

  // --- Estados de paginación ---
  const [commsPage, setCommsPage] = useState(1);
  const [docsPage, setDocsPage] = useState(1);
  const [pollsPage, setPollsPage] = useState(1);

  // 1. Comunicados ordenados por fecha descendente (más recientes primero)
  const sortedComms = useMemo(() => {
    const parseTime = (dateStr?: string) => {
      if (!dateStr) return 0;
      if (dateStr.toLowerCase() === 'hoy') return Date.now();
      const t = new Date(dateStr).getTime();
      return isNaN(t) ? 0 : t;
    };
    return [...publishedComms].sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt));
  }, [publishedComms]);

  const commsTotalPages = Math.max(1, Math.ceil(sortedComms.length / ITEMS_PER_PAGE));
  const paginatedComms = useMemo(() => {
    const start = (commsPage - 1) * ITEMS_PER_PAGE;
    return sortedComms.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedComms, commsPage]);

  // 2. Reglamentos y Actas ordenados por fecha descendente (más recientes primero)
  const sortedDocs = useMemo(() => {
    return [...documents].sort((a, b) => {
      const timeA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const timeB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [documents]);

  const docsTotalPages = Math.max(1, Math.ceil(sortedDocs.length / ITEMS_PER_PAGE));
  const paginatedDocs = useMemo(() => {
    const start = (docsPage - 1) * ITEMS_PER_PAGE;
    return sortedDocs.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedDocs, docsPage]);

  // 3. Votaciones de asamblea ordenadas por fecha descendente (más recientes primero)
  const sortedPolls = useMemo(() => {
    return [...polls].sort((a, b) => {
      const timeA = a.rawCreatedAt ? new Date(a.rawCreatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.rawCreatedAt ? new Date(b.rawCreatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
  }, [polls]);

  const pollsTotalPages = Math.max(1, Math.ceil(sortedPolls.length / ITEMS_PER_PAGE));
  const paginatedPolls = useMemo(() => {
    const start = (pollsPage - 1) * ITEMS_PER_PAGE;
    return sortedPolls.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedPolls, pollsPage]);

  // Asegurar que la página no exceda el total si los datos cambian
  useEffect(() => {
    if (commsPage > commsTotalPages) setCommsPage(commsTotalPages);
  }, [commsTotalPages, commsPage]);

  useEffect(() => {
    if (docsPage > docsTotalPages) setDocsPage(docsTotalPages);
  }, [docsTotalPages, docsPage]);

  useEffect(() => {
    if (pollsPage > pollsTotalPages) setPollsPage(pollsTotalPages);
  }, [pollsTotalPages, pollsPage]);

  useEffect(() => {
    let isMounted = true;
    pollService.getPolls().then((data) => {
      if (isMounted) setPolls(data);
    });

    const unsubscribe = livePollService.subscribeToLivePoll(() => {
      pollService.getPolls().then((data) => {
        if (isMounted) setPolls(data);
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
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
          Comunicados ({sortedComms.length})
        </button>
        <button
          onClick={() => setTab('Documentos')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tab === 'Documentos'
              ? 'bg-[var(--tenant-primary)] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          Reglamentos y Actas ({sortedDocs.length})
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
          Asambleas & Votos ({sortedPolls.length})
        </button>
      </div>

      {/* Tab 1: Communications Feed */}
      {tab === 'Comunicados' && (
        <div className="space-y-3">
          {sortedComms.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No hay comunicados publicados</p>
              <p className="text-xs text-slate-400 mt-1">Los avisos y circulares de la administración aparecerán aquí.</p>
            </div>
          ) : (
            <>
              {paginatedComms.map((comm) => {
                const isExpanded = !!expandedCommIds[comm.id];
                const isLongContent = comm.content.length > 220;

                return (
                  <Card key={comm.id} className="p-4 rounded-2xl border border-slate-200/80 shadow-xs bg-white flex flex-col justify-between overflow-hidden">
                    <div className="min-w-0">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 gap-2">
                        <span className="font-bold text-[var(--tenant-primary)] bg-blue-50 px-2 py-0.5 rounded truncate">
                          {comm.category || 'General'}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="w-3 h-3" /> {formatDate(comm.createdAt)}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 leading-snug break-words [overflow-wrap:anywhere]">
                        {comm.title}
                      </h3>

                      <p 
                        className={`text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere] ${
                          isLongContent && !isExpanded ? 'line-clamp-3' : ''
                        }`}
                      >
                        {comm.content}
                      </p>

                      {isLongContent && (
                        <button
                          type="button"
                          onClick={() => toggleExpandComm(comm.id)}
                          className="mt-2 text-xs font-semibold text-[var(--tenant-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              Mostrar menos <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              Leer más <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-[11px] text-slate-400 min-w-0 gap-2">
                      <span className="truncate">Por: <strong className="text-slate-600 font-medium">{comm.authorName}</strong></span>
                      <span className="font-semibold text-slate-600 truncate shrink-0">Para: {comm.audience}</span>
                    </div>
                  </Card>
                );
              })}

              <PaginationControls
                currentPage={commsPage}
                totalPages={commsTotalPages}
                totalItems={sortedComms.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCommsPage}
                itemName="comunicados"
              />
            </>
          )}
        </div>
      )}

      {/* Tab 2: Documents Feed */}
      {tab === 'Documentos' && (
        <div className="space-y-3">
          {sortedDocs.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No hay reglamentos ni actas disponibles</p>
              <p className="text-xs text-slate-400 mt-1">Los reglamentos, actas y manuales oficiales aparecerán aquí.</p>
            </div>
          ) : (
            <>
              {paginatedDocs.map((doc) => (
                <Card key={doc.id} className="p-4 rounded-2xl border border-slate-200/80 shadow-xs bg-white flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[var(--tenant-primary)] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{doc.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {doc.category} · {doc.fileType} ({doc.fileSize})
                        {doc.uploadedAt && <span className="text-slate-400"> · {doc.uploadedAt}</span>}
                      </p>
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

              <PaginationControls
                currentPage={docsPage}
                totalPages={docsTotalPages}
                totalItems={sortedDocs.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setDocsPage}
                itemName="documentos"
              />
            </>
          )}
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

            {sortedPolls.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80">
                <Vote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No hay votaciones registradas</p>
                <p className="text-xs text-slate-400 mt-1">Las votaciones y mociones de asamblea aparecerán aquí cuando sean convocadas.</p>
              </div>
            ) : (
              <>
                {paginatedPolls.map((p) => {
                  // Fase 2 / E5: el estado de voto de cada unidad viene del backend (no de localStorage); una consulta
                  // por pregunta de la página visible (máximo ITEMS_PER_PAGE), cacheada por pregunta.
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

                      <ResidentPollCardFooter pollId={p.id} pollIsLive={isLive} />
                    </div>
                  );
                })}

                <PaginationControls
                  currentPage={pollsPage}
                  totalPages={pollsTotalPages}
                  totalItems={sortedPolls.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setPollsPage}
                  itemName="votaciones"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Selected Poll Modal */}
      {selectedPoll && (
        <ResidentVoteModal
          poll={selectedPoll}
          isOpen={!!selectedPoll}
          onClose={() => {
            setSelectedPoll(null);
            pollService.getPolls().then(setPolls);
          }}
          propertyId={activePropertyId || ''}
          propertyUnit={activeLabel || propertyUnit}
          residentName={residentName}
          onVoted={(id) => queryClient.invalidateQueries({ queryKey: myVotingUnitsKey(id) })}
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
