import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, LayoutGrid, Flag, Check, X, EyeOff, ChevronLeft, ChevronRight,
  Package, Wrench, AlertCircle, ShoppingBag, Settings
} from 'lucide-react';
import { marketplaceService } from '../../services/marketplaceService';
import { notificationService } from '../../services/notificationService';
import type { MarketplaceListing, MarketplaceReport } from '../../types';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { ListingDetailModal } from '../resident/ResidentMarketplace';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(listing: MarketplaceListing) {
  if (listing.priceType === 'CONTACT') return 'A consultar';
  if (listing.price == null) return '—';
  return `$${Number(listing.price).toLocaleString('es-CO')}`;
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

function RejectModal({
  listing,
  onClose,
  onConfirm,
}: {
  listing: MarketplaceListing;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { setError('El motivo es obligatorio'); return; }
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Rechazar publicación</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[260px]">«{listing.title}»</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo del rechazo</label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              rows={4}
              maxLength={500}
              placeholder="Explica al usuario por qué su publicación no fue aprobada..."
              className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-100 resize-none ${error ? 'border-red-300' : 'border-slate-200'}`}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors">
              Rechazar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Pending Tab ──────────────────────────────────────────────────────────────

function PendingTab() {
  const queryClient = useQueryClient();
  const [rejectingListing, setRejectingListing] = useState<MarketplaceListing | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-marketplace-pending', currentPage],
    queryFn: () => marketplaceService.admin.getPendingListings({ page: currentPage - 1 }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => marketplaceService.admin.approveListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketplace'] });
      notificationService.showToast('Publicación aprobada', 'success');
    },
    onError: () => notificationService.showToast('Error al aprobar', 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      marketplaceService.admin.rejectListing(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketplace'] });
      setRejectingListing(null);
      notificationService.showToast('Publicación rechazada', 'success');
    },
    onError: () => notificationService.showToast('Error al rechazar', 'error'),
  });

  const listings = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;

  if (isLoading) return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex gap-3">
          <Skeleton className="w-14 h-14 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );

  if (listings.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-3">
        <Check className="w-7 h-7 text-green-400" />
      </div>
      <h3 className="font-bold text-slate-700">Todo al día</h3>
      <p className="text-sm text-slate-500 mt-1">No hay publicaciones pendientes de revisión</p>
    </div>
  );

  return (
    <>
      <div className="space-y-3">
        {listings.map(listing => (
          <div key={listing.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start gap-3">
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-xl bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                {listing.imageUrls[0] ? (
                  <img src={listing.imageUrls[0]} alt={listing.title} className="w-full h-full object-cover" />
                ) : listing.type === 'PRODUCT' ? (
                  <Package className="w-6 h-6 text-slate-300" />
                ) : (
                  <Wrench className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${listing.type === 'PRODUCT' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {listing.type === 'PRODUCT' ? 'Producto' : 'Servicio'}
                      </span>
                      <span className="text-[10px] text-slate-400">{listing.category}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{listing.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{listing.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-bold" style={{ color: 'var(--tenant-primary)' }}>{formatPrice(listing)}</span>
                      <span className="text-[10px] text-slate-400">por {listing.author.fullName}</span>
                      <span className="text-[10px] text-slate-400">{new Date(listing.createdAt).toLocaleDateString('es-CO')}</span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => approveMutation.mutate(listing.id)}
                      disabled={approveMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => setRejectingListing(listing)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-700">{currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {rejectingListing && (
        <RejectModal
          listing={rejectingListing}
          onClose={() => setRejectingListing(null)}
          onConfirm={(reason) => rejectMutation.mutate({ id: rejectingListing.id, reason })}
        />
      )}
    </>
  );
}

// ─── All Listings Tab ─────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'PUBLISHED', label: 'Publicadas' },
  { value: 'PENDING_APPROVAL', label: 'Pendientes' },
  { value: 'REJECTED', label: 'Rechazadas' },
  { value: 'HIDDEN', label: 'Ocultas' },
  { value: 'EXPIRED', label: 'Expiradas' },
];

const STATUS_BADGE: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
  HIDDEN: 'bg-slate-100 text-slate-600',
  EXPIRED: 'bg-slate-100 text-slate-400',
};
const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: 'Publicada', PENDING_APPROVAL: 'Pendiente',
  REJECTED: 'Rechazada', HIDDEN: 'Oculta', EXPIRED: 'Expirada',
};

function AllListingsTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-marketplace-all', statusFilter, currentPage],
    queryFn: () => marketplaceService.admin.getListings({ status: statusFilter || undefined, page: currentPage - 1 }),
  });

  const hideMutation = useMutation({
    mutationFn: (id: string) => marketplaceService.admin.hideListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketplace'] });
      notificationService.showToast('Publicación ocultada', 'success');
    },
    onError: () => notificationService.showToast('Error al ocultar', 'error'),
  });

  const listings = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-xs text-slate-400">{data?.totalElements ?? 0} publicaciones</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex gap-3">
              <Skeleton className="w-14 h-14 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ShoppingBag className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-sm text-slate-500">No hay publicaciones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {listings.map(listing => (
            <div key={listing.id} className="bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                {listing.imageUrls[0] ? (
                  <img src={listing.imageUrls[0]} alt={listing.title} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-5 h-5 text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[listing.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABEL[listing.status] ?? listing.status}
                  </span>
                  <span className="text-[10px] text-slate-400">{listing.category}</span>
                </div>
                <p className="font-semibold text-slate-800 text-sm truncate">{listing.title}</p>
                <p className="text-[10px] text-slate-400">por {listing.author.fullName} · {new Date(listing.createdAt).toLocaleDateString('es-CO')}</p>
              </div>
              {listing.status === 'PUBLISHED' && (
                <button
                  onClick={() => hideMutation.mutate(listing.id)}
                  disabled={hideMutation.isPending}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                >
                  <EyeOff className="w-3 h-3" />
                  Ocultar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-3">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-700">{currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

const REASON_LABEL: Record<string, string> = {
  INAPPROPRIATE: 'Contenido inapropiado',
  NOT_ALLOWED: 'No permitido',
  MISLEADING: 'Información engañosa',
  SPAM: 'Spam',
  OTHER: 'Otro',
};

function ReportsTab() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingListingId, setViewingListingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-marketplace-reports', currentPage],
    queryFn: () => marketplaceService.admin.getReports({ page: currentPage - 1 }),
  });

  useEffect(() => {
    const handleReportEvent = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketplace-reports'] });
    };

    window.addEventListener('MARKETPLACE_REPORT_CREATED', handleReportEvent);
    window.addEventListener('MARKETPLACE_REPORT_RESOLVED', handleReportEvent);

    return () => {
      window.removeEventListener('MARKETPLACE_REPORT_CREATED', handleReportEvent);
      window.removeEventListener('MARKETPLACE_REPORT_RESOLVED', handleReportEvent);
    };
  }, [queryClient]);

  const { data: viewingListing } = useQuery({
    queryKey: ['marketplace-listing', viewingListingId],
    queryFn: () => viewingListingId ? marketplaceService.getListingById(viewingListingId) : Promise.reject(),
    enabled: !!viewingListingId,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'RESOLVE' | 'DISMISS' }) =>
      marketplaceService.admin.resolveReport(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketplace-reports'] });
      notificationService.showToast('Reporte actualizado', 'success');
    },
    onError: () => notificationService.showToast('Error al procesar el reporte', 'error'),
  });

  const hideMutation = useMutation({
    mutationFn: (id: string) => marketplaceService.admin.hideListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketplace-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-marketplace-all'] });
      notificationService.showToast('Publicación ocultada', 'success');
    },
    onError: () => notificationService.showToast('Error al ocultar la publicación', 'error'),
  });

  const reports: MarketplaceReport[] = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;

  if (isLoading) return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );

  if (reports.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
        <Flag className="w-7 h-7 text-slate-300" />
      </div>
      <h3 className="font-bold text-slate-700">Sin reportes</h3>
      <p className="text-sm text-slate-500 mt-1">No hay reportes pendientes</p>
    </div>
  );

  return (
    <>
      <div className="space-y-3">
        {reports.map(report => {
          const listing = report.listing;
          const firstImage = listing?.imageUrls?.[0];

          return (
            <div key={report.id} className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-slate-200 transition-colors shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
                
                {/* Minicard de la publicación (Clickable) */}
                <button
                  onClick={() => setViewingListingId(listing.id)}
                  className="flex-1 flex items-start gap-3 text-left group min-w-0 w-full"
                >
                  <div className="w-14 h-14 rounded-xl bg-slate-50 shrink-0 overflow-hidden flex items-center justify-center border border-slate-100">
                    {firstImage ? (
                      <img src={firstImage} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : listing?.type === 'PRODUCT' ? (
                      <Package className="w-5 h-5 text-slate-300" />
                    ) : (
                      <Wrench className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 text-sm leading-tight truncate group-hover:text-[var(--tenant-primary)] transition-colors">
                      {listing?.title || 'Publicación eliminada'}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                        {REASON_LABEL[report.reason] ?? report.reason}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        report.status === 'OPEN' ? 'bg-amber-100 text-amber-700'
                        : report.status === 'RESOLVED' ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                      }`}>
                        {report.status === 'OPEN' ? 'Abierto' : report.status === 'RESOLVED' ? 'Resuelto' : 'Desestimado'}
                      </span>
                    </div>
                    {report.description && (
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 border-l-2 border-slate-200 pl-2 ml-1 italic">"{report.description}"</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">{new Date(report.createdAt).toLocaleDateString('es-CO')}</p>
                  </div>
                </button>

                {/* Acciones del reporte */}
                {report.status === 'OPEN' && (
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 mt-2 sm:mt-0 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                    <button
                    onClick={() => hideMutation.mutate(report.listing.id)}
                    disabled={hideMutation.isPending}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <EyeOff className="w-3 h-3" />
                    Ocultar
                  </button>
                  <button
                    onClick={() => resolveMutation.mutate({ id: report.id, action: 'RESOLVE' })}
                    disabled={resolveMutation.isPending}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                    Resolver
                  </button>
                  <button
                    onClick={() => resolveMutation.mutate({ id: report.id, action: 'DISMISS' })}
                    disabled={resolveMutation.isPending}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                    Desestimar
                  </button>
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>
      
      {/* Listing Detail Modal */}
      {viewingListing && (
        <ListingDetailModal
          listing={viewingListing}
          currentUserId={viewingListing.author.userId} // Para ocultar el botón 'Reportar'
          onClose={() => setViewingListingId(null)}
          onReport={() => {}}
        />
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-3">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-700">{currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}

import { AdminMarketplaceSettings } from './AdminMarketplaceSettings';

// ─── Main Component ───────────────────────────────────────────────────────────

type AdminTab = 'pending' | 'all' | 'reports' | 'config';

const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'pending', label: 'Pendientes', icon: <Clock className="w-4 h-4" /> },
  { id: 'all', label: 'Todas', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'reports', label: 'Reportes', icon: <Flag className="w-4 h-4" /> },
  { id: 'config', label: 'Configuración', icon: <Settings className="w-4 h-4" /> },
];

export function AdminMarketplacePage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('pending');

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6" style={{ color: 'var(--tenant-primary)' }} />
          Marketplace
        </h1>
        <p className="text-sm text-slate-500 mt-1">Modera las publicaciones de tu comunidad</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-100 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-slate-900 border-current'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
            style={activeTab === tab.id ? { borderColor: 'var(--tenant-primary)', color: 'var(--tenant-primary)' } : {}}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'pending' && <PendingTab />}
        {activeTab === 'all' && <AllListingsTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'config' && <AdminMarketplaceSettings isTab={true} />}
      </div>
    </div>
  );
}
