import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Package, Wrench, Pencil, Trash2, X, Clock, CheckCircle,
  XCircle, EyeOff, AlertCircle, ShoppingBag, Plus,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { marketplaceService, type UpdateListingDto } from '../../services/marketplaceService';
import { notificationService } from '../../services/notificationService';
import type { MarketplaceListing, ListingStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { Skeleton } from '../../components/ui/Skeleton';

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
  
  // Extract keys from URLs
  const initialKeys = listing.imageUrls.map(url => url.split('/public/files/')[1] || url);
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
    if (!form.contactPhone.trim()) e.contactPhone = 'El teléfono de contacto es obligatorio';
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
                  setForm(f => ({ ...f, contactPhone: e.target.value }));
                  if (e.target.value) setErrors(err => ({ ...err, contactPhone: '' }));
                }}
                maxLength={50}
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
  onDelete,
}: {
  listing: MarketplaceListing;
  onEdit: (l: MarketplaceListing) => void;
  onDelete: (l: MarketplaceListing) => void;
}) {
  const statusConf = STATUS_CONFIG[listing.status];
  const canEdit = listing.status === 'PUBLISHED' || listing.status === 'PENDING_APPROVAL';
  const firstImage = listing.imageUrls[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusConf.color}`}>
                  {statusConf.icon}
                  {statusConf.label}
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
            <div className="flex items-center gap-1 shrink-0">
              {canEdit && (
                <button
                  onClick={() => onEdit(listing)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {listing.status !== 'HIDDEN' && (
                <button
                  onClick={() => onDelete(listing)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Ocultar publicación"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            {new Date(listing.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Rejection reason */}
      {listing.status === 'REJECTED' && listing.rejectionReason && (
        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => marketplaceService.deleteListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      notificationService.showToast('Publicación ocultada', 'success');
    },
    onError: () => notificationService.showToast('No se pudo ocultar la publicación', 'error'),
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

  const handleDelete = async (listing: MarketplaceListing) => {
    const confirmed = await notificationService.showConfirm(
      'Ocultar publicación',
      `¿Estás seguro de que quieres ocultar "${listing.title}"? Dejará de ser visible para los demás residentes.`,
      'Sí, ocultar',
      'Cancelar',
    );
    if (confirmed) deleteMutation.mutate(listing.id);
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
                ? 'text-white'
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
              onDelete={handleDelete}
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
