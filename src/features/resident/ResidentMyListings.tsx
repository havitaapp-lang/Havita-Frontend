import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Package, Wrench, Pencil, Trash2, X, Clock, CheckCircle,
  XCircle, Eye, EyeOff, AlertCircle, ShoppingBag, Plus, ShieldAlert, Lock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { marketplaceService, type UpdateListingDto } from '../../services/marketplaceService';
import { notificationService } from '../../services/notificationService';
import type { MarketplaceListing, ListingStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { isValidPhone, sanitizePhoneInput } from '../../utils/sanitizers';
import { VALIDATION_MESSAGES } from '../../validation/messages/es';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ListingStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PUBLISHED: { label: 'Publicada', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  PENDING_APPROVAL: { label: 'En revisión', color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> },
  REJECTED: { label: 'Rechazada', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
  HIDDEN: { label: 'Oculta', color: 'bg-slate-100 text-slate-600', icon: <EyeOff className="w-3 h-3" /> },
  EXPIRED: { label: 'Expirada', color: 'bg-slate-100 text-slate-400', icon: <AlertCircle className="w-3 h-3" /> },
};

const STATUS_TABS: { value: ListingStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'PUBLISHED', label: 'Publicadas' },
  { value: 'PENDING_APPROVAL', label: 'En revisión' },
  { value: 'REJECTED', label: 'Rechazadas' },
  { value: 'HIDDEN', label: 'Ocultas' },
];

function formatPrice(listing: MarketplaceListing) {
  if (listing.priceType === 'CONTACT') return 'Precio a consultar';
  if (listing.price == null) return '—';
  const formatted = Number(listing.price).toLocaleString('es-CO');
  return listing.priceType === 'NEGOTIABLE' ? `$${formatted} (neg.)` : `$${formatted}`;
}

// ─── EditListingModal ─────────────────────────────────────────────────────────

function EditListingModal({
  listing,
  onClose,
  onSuccess,
}: {
  listing: MarketplaceListing;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth() as any;
  const [form, setForm] = useState({
    title: listing.title,
    description: listing.description,
    contactPhone: listing.contactPhone ?? '',
    priceType: listing.priceType,
    price: listing.price != null ? String(listing.price) : '',
  });
  
  // SEC-9-9: las URLs son firmadas y temporales; las claves llegan aparte en imageKeys.
  const initialKeys = listing.imageKeys ?? [];
  const [uploadedKeys, setUploadedKeys] = useState<string[]>(initialKeys);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(listing.imageUrls);
  
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (uploadedKeys.length + files.length > 5) {
      notificationService.showToast('Máximo 5 imágenes permitidas', 'error');
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const result = await marketplaceService.uploadImage(file, `marketplace/${user?.id || 'unknown'}`);
        setUploadedKeys(prev => [...prev, result.storageKey]);
        setUploadedUrls(prev => [...prev, result.url]);
      }
    } catch {
      notificationService.showToast('Error al subir imagen', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setUploadedKeys(prev => prev.filter((_, i) => i !== index));
    setUploadedUrls(prev => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'El título es obligatorio';
    if (!form.description.trim()) e.description = 'La descripción es obligatoria';
    if (form.priceType !== 'CONTACT' && !form.price) e.price = 'El precio es obligatorio';
    else if (form.price && (isNaN(Number(form.price)) || Number(form.price) < 0)) e.price = 'El precio debe ser un número mayor o igual a 0';
    if (!form.contactPhone.trim()) e.contactPhone = 'El teléfono de contacto es obligatorio';
    else if (!isValidPhone(form.contactPhone)) e.contactPhone = VALIDATION_MESSAGES.INVALID_PHONE;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const payload: UpdateListingDto = {
        title: form.title.trim(),
        description: form.description.trim(),
        contactPhone: form.contactPhone.trim() || undefined,
        priceType: form.priceType,
        price: form.priceType !== 'CONTACT' && form.price ? Number(form.price) : null,
        imageKeys: uploadedKeys,
      };
      await marketplaceService.updateListing(listing.id, payload);
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      notificationService.showToast('Publicación actualizada', 'success');
      onSuccess();
    } catch {
      notificationService.showToast('No se pudo actualizar la publicación', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <h3 className="text-base font-bold text-slate-900">Editar publicación</h3>
          <button onClick={() => !isSubmitting && onClose()} className="p-1.5 rounded-xl hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            
            {/* Image Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Imágenes (Máx 5)</label>
              <div className="flex flex-wrap gap-2">
                {uploadedUrls.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {uploadedUrls.length < 5 && (
                  <label className="w-16 h-16 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors">
                    {uploading ? (
                      <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-slate-400 mb-0.5" />
                        <span className="text-[9px] text-slate-500 font-medium">Añadir</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileSelect} disabled={uploading} />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Título</label>
              <input
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                maxLength={150}
                className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.title ? 'border-red-300' : 'border-slate-200'}`}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                maxLength={2000}
                rows={4}
                className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none ${errors.description ? 'border-red-300' : 'border-slate-200'}`}
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono de contacto</label>
              <input
                value={form.contactPhone}
                onChange={(e) => {
                  setForm(f => ({ ...f, contactPhone: sanitizePhoneInput(e.target.value) }));
                  if (e.target.value) setErrors(err => ({ ...err, contactPhone: '' }));
                }}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
                className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.contactPhone ? 'border-red-300' : 'border-slate-200'}`}
              />
              {errors.contactPhone && <p className="text-xs text-red-500 mt-1">{errors.contactPhone}</p>}
            </div>
            {form.priceType !== 'CONTACT' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Precio</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                  min="0"
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.price ? 'border-red-300' : 'border-slate-200'}`}
                />
                {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 p-5 border-t border-slate-100 shrink-0">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <SubmitButton isSubmitting={isSubmitting} loadingText="Guardando...">Guardar cambios</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ListingItem ──────────────────────────────────────────────────────────────

function ListingItem({
  listing,
  onEdit,
  onHide,
  onUnhide,
  onPurge,
  isUnhiding,
}: {
  listing: MarketplaceListing;
  onEdit: (l: MarketplaceListing) => void;
  onHide: (l: MarketplaceListing) => void;
  onUnhide: (l: MarketplaceListing) => void;
  onPurge: (l: MarketplaceListing) => void;
  isUnhiding?: boolean;
}) {
  const isHidden = listing.status === 'HIDDEN';
  const isHiddenByAdmin = isHidden && !!listing.hiddenByAdmin;
  const canEdit = listing.status === 'PUBLISHED' || listing.status === 'PENDING_APPROVAL' || (isHidden && !isHiddenByAdmin);
  const firstImage = listing.imageUrls[0];

  let statusBadge = STATUS_CONFIG[listing.status] ?? STATUS_CONFIG.PUBLISHED;
  if (isHiddenByAdmin) {
    statusBadge = {
      label: 'Suspendida por administración',
      color: 'bg-rose-50 text-rose-700 border border-rose-200/80',
      icon: <ShieldAlert className="w-3 h-3 text-rose-600" />
    };
  } else if (isHidden) {
    statusBadge = {
      label: 'Ocultada por ti',
      color: 'bg-slate-100 text-slate-600 border border-slate-200/50',
      icon: <EyeOff className="w-3 h-3 text-slate-500" />
    };
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:border-slate-200">
      <div className="flex items-start gap-3 p-4">
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
          {firstImage ? (
            <img src={firstImage} alt={listing.title} className="w-full h-full object-cover" />
          ) : listing.type === 'PRODUCT' ? (
            <Package className="w-7 h-7 text-slate-300" />
          ) : (
            <Wrench className="w-7 h-7 text-slate-300" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge.color}`}>
                  {statusBadge.icon}
                  {statusBadge.label}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${listing.type === 'PRODUCT' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                  {listing.type === 'PRODUCT' ? 'Producto' : 'Servicio'}
                </span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm leading-tight truncate">{listing.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{listing.category}</p>
              <p className="text-sm font-bold mt-1" style={{ color: 'var(--tenant-primary)' }}>
                {formatPrice(listing)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* If hidden by resident: show primary "Hacer visible" button */}
              {isHidden && !isHiddenByAdmin && (
                <button
                  onClick={() => onUnhide(listing)}
                  disabled={isUnhiding}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white rounded-xl shadow-xs transition-opacity hover:opacity-95 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--tenant-primary)' }}
                  title="Hacer visible nuevamente en el marketplace"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hacer visible</span>
                </button>
              )}

              {/* If hidden by admin: show locked indicator */}
              {isHiddenByAdmin && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 rounded-xl border border-rose-200 cursor-not-allowed"
                  title="Suspendida por infracción de normas. No puede ser reactivada por el residente."
                >
                  <Lock className="w-3 h-3" />
                  <span className="hidden sm:inline">Bloqueada</span>
                </span>
              )}

              {/* Edit button */}
              {canEdit && (
                <button
                  onClick={() => onEdit(listing)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Editar publicación"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Hide button if currently active */}
              {listing.status !== 'HIDDEN' && (
                <button
                  onClick={() => onHide(listing)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Ocultar publicación"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Purge / permanent delete button */}
              <button
                onClick={() => onPurge(listing)}
                className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                title="Eliminar definitivamente"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            Creada el {new Date(listing.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Admin Infraction Banner */}
      {isHiddenByAdmin && (
        <div className="mx-4 mb-4 p-3.5 bg-rose-50/80 border border-rose-200 rounded-2xl">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-rose-900">Publicación suspendida por la administración</p>
              <p className="text-rose-800">
                <span className="font-semibold">Motivo: </span>
                {listing.hiddenReason || 'Infracción a las normas de convivencia o reglamento del conjunto.'}
              </p>
              <p className="text-[11px] text-rose-600/90 pt-0.5">
                Esta publicación infringió los lineamientos de la copropiedad y no puede ser reactivada por el residente. Si consideras que se trata de un error, por favor comunícate con la administración.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Self-hidden reminder banner with quick unhide */}
      {isHidden && !isHiddenByAdmin && (
        <div className="mx-4 mb-4 p-3 bg-slate-50 border border-slate-200/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <EyeOff className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Pausaste esta publicación. Los demás residentes no pueden verla en el marketplace.</span>
          </div>
          <button
            onClick={() => onUnhide(listing)}
            disabled={isUnhiding}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs transition-opacity hover:opacity-95 shrink-0 disabled:opacity-50"
            style={{ backgroundColor: 'var(--tenant-primary)' }}
          >
            <Eye className="w-3.5 h-3.5" />
            Hacer visible
          </button>
        </div>
      )}

      {/* Rejection reason */}
      {listing.status === 'REJECTED' && listing.rejectionReason && (
        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-100 rounded-2xl">
          <p className="text-xs font-semibold text-red-700 mb-0.5">Motivo del rechazo:</p>
          <p className="text-xs text-red-600">{listing.rejectionReason}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ResidentMyListings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ListingStatus | 'ALL'>('ALL');
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace', 'my-listings'],
    queryFn: () => marketplaceService.getMyListings({ size: 100 }),
  });

  const hideMutation = useMutation({
    mutationFn: (id: string) => marketplaceService.hideListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      notificationService.showToast('Publicación ocultada temporalmente', 'success');
    },
    onError: () => notificationService.showToast('No se pudo ocultar la publicación', 'error'),
  });

  const unhideMutation = useMutation({
    mutationFn: (id: string) => marketplaceService.unhideListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      notificationService.showToast('Publicación visible nuevamente en el marketplace', 'success');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'No se pudo reactivar la publicación';
      notificationService.showToast(msg, 'error');
    },
  });

  const purgeMutation = useMutation({
    mutationFn: (id: string) => marketplaceService.purgeListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      notificationService.showToast('Publicación eliminada definitivamente', 'success');
    },
    onError: () => notificationService.showToast('No se pudo eliminar la publicación', 'error'),
  });

  const allListings = data?.content ?? [];
  const filtered = activeTab === 'ALL' ? allListings : allListings.filter(l => l.status === activeTab);

  const tabCounts: Record<ListingStatus | 'ALL', number> = {
    ALL: allListings.length,
    PUBLISHED: allListings.filter(l => l.status === 'PUBLISHED').length,
    PENDING_APPROVAL: allListings.filter(l => l.status === 'PENDING_APPROVAL').length,
    REJECTED: allListings.filter(l => l.status === 'REJECTED').length,
    HIDDEN: allListings.filter(l => l.status === 'HIDDEN').length,
    EXPIRED: allListings.filter(l => l.status === 'EXPIRED').length,
  };

  const handleHide = async (listing: MarketplaceListing) => {
    const confirmed = await notificationService.showConfirm(
      'Ocultar publicación',
      `¿Deseas pausar u ocultar "${listing.title}"? Dejará de ser visible para los demás residentes, pero podrás reactivarla cuando quieras.`,
      'Sí, ocultar',
      'Cancelar',
    );
    if (confirmed) hideMutation.mutate(listing.id);
  };

  const handleUnhide = async (listing: MarketplaceListing) => {
    if (listing.hiddenByAdmin) {
      notificationService.showToast('Esta publicación fue suspendida por la administración por infringir normas y no puede ser reactivada por el residente.', 'error');
      return;
    }
    const confirmed = await notificationService.showConfirm(
      'Hacer visible la publicación',
      `¿Deseas volver a hacer visible "${listing.title}"? Todos los residentes podrán volver a encontrarla en el marketplace.`,
      'Sí, hacer visible',
      'Cancelar',
    );
    if (confirmed) unhideMutation.mutate(listing.id);
  };

  const handlePurge = async (listing: MarketplaceListing) => {
    const confirmed = await notificationService.showConfirm(
      'Eliminar publicación',
      `¿Estás seguro de que quieres eliminar definitivamente "${listing.title}"? Esta acción borrará el registro por completo.`,
      'Sí, eliminar',
      'Cancelar',
    );
    if (confirmed) purgeMutation.mutate(listing.id);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/resident/marketplace"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al marketplace
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Mis publicaciones</h1>
        <p className="text-sm text-slate-500 mt-1">Gestiona tus productos y servicios publicados</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
              activeTab === tab.value
                ? 'text-white shadow-xs'
                : 'bg-slate-100 text-slate-500 hover:text-slate-700'
            }`}
            style={activeTab === tab.value ? { backgroundColor: 'var(--tenant-primary)' } : {}}
          >
            {tab.label}
            {tabCounts[tab.value] > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.value ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {tabCounts[tab.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex gap-3">
              <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <ShoppingBag className="w-7 h-7 text-slate-300" />
          </div>
          <h3 className="font-bold text-slate-700">Sin publicaciones</h3>
          <p className="text-sm text-slate-500 mt-1">
            {activeTab === 'ALL' ? 'Aún no has creado ninguna publicación.' : `No tienes publicaciones con estado "${STATUS_CONFIG[activeTab as ListingStatus]?.label}".`}
          </p>
          {activeTab === 'ALL' && (
            <Link
              to="/resident/marketplace"
              className="mt-3 text-xs font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--tenant-primary)' }}
            >
              + Crear publicación
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(listing => (
            <ListingItem
              key={listing.id}
              listing={listing}
              onEdit={setEditingListing}
              onHide={handleHide}
              onUnhide={handleUnhide}
              onPurge={handlePurge}
              isUnhiding={unhideMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSuccess={() => setEditingListing(null)}
        />
      )}
    </div>
  );
}
