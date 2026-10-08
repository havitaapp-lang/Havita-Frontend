import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, Package, Wrench, Search, Plus, ChevronLeft, ChevronRight,
  X, Phone, Flag, Upload, Trash2, ImageOff, ListChecks, Tag, DollarSign,
  ChevronRight as ChevronRightIcon, MessageCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { marketplaceService, type CreateListingDto, type ReportListingDto } from '../../services/marketplaceService';
import { notificationService } from '../../services/notificationService';
import type { MarketplaceListing, ListingType, ReportReason } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormField } from '../../components/ui/FormField';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { Skeleton } from '../../components/ui/Skeleton';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_CATEGORIES = ['Hogar', 'Tecnología', 'Ropa y accesorios', 'Alimentos', 'Belleza', 'Otros'];
const SERVICE_CATEGORIES = ['Educación', 'Hogar', 'Tecnología', 'Belleza', 'Transporte', 'Profesionales', 'Otros'];

const PRICE_TYPES = [
  { value: 'FIXED', label: 'Precio fijo' },
  { value: 'NEGOTIABLE', label: 'Negociable' },
  { value: 'CONTACT', label: 'Precio a consultar' },
] as const;

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'INAPPROPRIATE', label: 'Contenido inapropiado' },
  { value: 'NOT_ALLOWED', label: 'Producto/servicio no permitido' },
  { value: 'MISLEADING', label: 'Información engañosa' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'OTHER', label: 'Otro' },
];

const TYPE_TABS = [
  { value: '', label: 'Todos' },
  { value: 'PRODUCT', label: 'Productos' },
  { value: 'SERVICE', label: 'Servicios' },
];

function formatPrice(listing: MarketplaceListing) {
  if (listing.priceType === 'CONTACT') return 'Precio a consultar';
  if (listing.price == null) return '—';
  const formatted = Number(listing.price).toLocaleString('es-CO');
  return listing.priceType === 'NEGOTIABLE' ? `$${formatted} (neg.)` : `$${formatted}`;
}

// ─── ListingCard ──────────────────────────────────────────────────────────────

function ListingCard({ listing, onClick }: { listing: MarketplaceListing; onClick: () => void }) {
  const isProduct = listing.type === 'PRODUCT';
  const firstImage = listing.imageUrls[0];

  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      onClick={onClick}
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
        {firstImage ? (
          <img src={firstImage} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isProduct
              ? <Package className="w-10 h-10 text-slate-300" />
              : <Wrench className="w-10 h-10 text-slate-300" />}
          </div>
        )}
        <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isProduct ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {isProduct ? 'Producto' : 'Servicio'}
        </span>
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{listing.category}</p>
        <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1.5">{listing.title}</h3>
        <p className="font-bold text-sm" style={{ color: 'var(--tenant-primary)' }}>
          {formatPrice(listing)}
        </p>
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-50">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
            style={{ backgroundColor: 'color-mix(in srgb, var(--tenant-primary) 15%, white)', color: 'var(--tenant-primary)' }}
          >
            {listing.author.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-slate-700 truncate">{listing.author.fullName}</p>
            {listing.author.propertyUnit && (
              <p className="text-[9px] text-slate-400 truncate">{listing.author.propertyUnit}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ListingDetailModal ───────────────────────────────────────────────────────

export function ListingDetailModal({
  listing,
  currentUserId,
  onClose,
  onReport,
}: {
  listing: MarketplaceListing;
  currentUserId?: string;
  onClose: () => void;
  onReport: (listing: MarketplaceListing) => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const isOwner = listing.author.userId === currentUserId;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              listing.type === 'PRODUCT' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {listing.type === 'PRODUCT' ? 'Producto' : 'Servicio'}
            </span>
            <span className="text-xs text-slate-400">{listing.category}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {/* Image gallery */}
          {listing.imageUrls.length > 0 && (
            <div className="relative bg-slate-100">
              <div className="aspect-[4/3] relative">
                <img
                  src={listing.imageUrls[imageIndex]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {listing.imageUrls.length > 1 && (
                <>
                  <button
                    onClick={() => setImageIndex(i => Math.max(0, i - 1))}
                    disabled={imageIndex === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 rounded-full shadow disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    onClick={() => setImageIndex(i => Math.min(listing.imageUrls.length - 1, i + 1))}
                    disabled={imageIndex === listing.imageUrls.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 rounded-full shadow disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                    {listing.imageUrls.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImageIndex(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imageIndex ? 'bg-white' : 'bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Info */}
          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{listing.title}</h2>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--tenant-primary)' }}>
                {formatPrice(listing)}
              </p>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{listing.description}</p>

            {/* Author */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: 'color-mix(in srgb, var(--tenant-primary) 15%, white)', color: 'var(--tenant-primary)' }}
              >
                {listing.author.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{listing.author.fullName}</p>
                {listing.author.propertyUnit && (
                  <p className="text-xs text-slate-500">{listing.author.propertyUnit}</p>
                )}
              </div>
            </div>

            {/* Published date */}
            {listing.publishedAt && (
              <p className="text-xs text-slate-400">
                Publicado el {new Date(listing.publishedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-2 shrink-0">
          {listing.contactPhone ? (
            <a
              href={`https://wa.me/${listing.contactPhone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 bg-green-500"
            >
              <MessageCircle className="w-4 h-4" />
              Contactar por WhatsApp
            </a>
          ) : (
            <div className="flex-1 text-center text-xs text-slate-400 py-2">
              El vendedor no compartió número de contacto
            </div>
          )}
          {!isOwner && (
            <button
              onClick={() => onReport(listing)}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 transition-colors text-slate-400"
              title="Reportar publicación"
            >
              <Flag className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ReportModal ──────────────────────────────────────────────────────────────

function ReportModal({
  listing,
  onClose,
  onSuccess,
}: {
  listing: MarketplaceListing;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState<ReportReason>('INAPPROPRIATE');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await marketplaceService.reportListing(listing.id, { reason, description: description || undefined });
      notificationService.showToast('Reporte enviado. La administración lo revisará.', 'success');
      onSuccess();
    } catch {
      notificationService.showToast('No se pudo enviar el reporte', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Reportar publicación</h3>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">«{listing.title}»</p>
          </div>
          <button onClick={() => !isSubmitting && onClose()} className="p-1.5 rounded-xl hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Motivo del reporte</label>
            <div className="space-y-2">
              {REPORT_REASONS.map(r => (
                <label key={r.value} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-slate-700">{r.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción adicional (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Describe brevemente el problema..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <SubmitButton isSubmitting={isSubmitting} loadingText="Enviando...">Enviar reporte</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CreateListingModal ───────────────────────────────────────────────────────

function CreateListingModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth() as any;
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<ListingType | null>(null);
  const [form, setForm] = useState({
    category: '',
    title: '',
    description: '',
    priceType: 'FIXED' as string,
    price: '',
    contactPhone: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedKeys, setUploadedKeys] = useState<string[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = selectedType === 'PRODUCT' ? PRODUCT_CATEGORIES : SERVICE_CATEGORIES;

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
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setUploadedKeys(prev => prev.filter((_, i) => i !== index));
    setUploadedUrls(prev => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.category) e.category = 'Selecciona una categoría';
    if (!form.title.trim()) e.title = 'El título es obligatorio';
    else if (form.title.length > 150) e.title = 'Máximo 150 caracteres';
    if (!form.description.trim()) e.description = 'La descripción es obligatoria';
    else if (form.description.length > 2000) e.description = 'Máximo 2000 caracteres';
    if (form.priceType !== 'CONTACT' && !form.price) e.price = 'El precio es obligatorio';
    if (form.price && isNaN(Number(form.price))) e.price = 'El precio debe ser numérico';
    if (!form.contactPhone.trim()) e.contactPhone = 'El teléfono de contacto es obligatorio';
    if (!termsAccepted) e.terms = 'Debes aceptar los términos y condiciones';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selectedType) return;
    setIsSubmitting(true);
    try {
      const payload: CreateListingDto = {
        type: selectedType,
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim(),
        priceType: form.priceType,
        price: form.priceType !== 'CONTACT' && form.price ? Number(form.price) : null,
        contactPhone: form.contactPhone.trim() || undefined,
        imageKeys: uploadedKeys.length > 0 ? uploadedKeys : undefined,
        termsAccepted: termsAccepted,
      };
      const result = await marketplaceService.createListing(payload);
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      const msg = result.status === 'PUBLISHED'
        ? '¡Tu publicación ya está visible en el marketplace!'
        : 'Tu publicación fue enviada a revisión.';
      notificationService.showToast(msg, 'success');
      onSuccess();
    } catch {
      notificationService.showToast('No se pudo crear la publicación', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onKeyDown={(e) => { if (e.key === 'Escape' && !isSubmitting) onClose(); }}
    >
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Nueva publicación</h3>
            <p className="text-xs text-slate-500">{step === 1 ? 'Paso 1 de 2 — ¿Qué quieres publicar?' : 'Paso 2 de 2 — Detalles de la publicación'}</p>
          </div>
          <button onClick={() => !isSubmitting && onClose()} className="p-1.5 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Step 1: Type selection */}
        {step === 1 && (
          <div className="p-6 space-y-4 flex-1">
            <p className="text-sm text-slate-600">Selecciona el tipo de publicación:</p>
            <div className="grid grid-cols-2 gap-4">
              {/* Product */}
              <button
                onClick={() => { setSelectedType('PRODUCT'); setStep(2); }}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                  <Package className="w-7 h-7 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-800 group-hover:text-blue-700">Producto</p>
                  <p className="text-xs text-slate-500 mt-0.5">Artículos físicos a vender</p>
                </div>
              </button>
              {/* Service */}
              <button
                onClick={() => { setSelectedType('SERVICE'); setStep(2); }}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-all duration-200 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center transition-colors">
                  <Wrench className="w-7 h-7 text-amber-600" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-800 group-hover:text-amber-700">Servicio</p>
                  <p className="text-xs text-slate-500 mt-0.5">Servicios que ofreces</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Form */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Category */}
              <FormField id="category" label="Categoría" required error={errors.category}>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>

              {/* Title */}
              <FormField id="title" label="Título" required error={errors.title} currentLength={form.title.length} maxLength={150}>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: iPhone 13 Pro en excelente estado"
                  maxLength={150}
                  hasError={!!errors.title}
                />
              </FormField>

              {/* Description */}
              <FormField id="description" label="Descripción" required error={errors.description} currentLength={form.description.length} maxLength={2000}>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe el producto o servicio en detalle..."
                  rows={4}
                  maxLength={2000}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none ${errors.description ? 'border-red-300' : 'border-slate-200'}`}
                />
              </FormField>

              {/* Price type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Precio</label>
                <div className="flex gap-2">
                  {PRICE_TYPES.map(pt => (
                    <button
                      key={pt.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, priceType: pt.value }))}
                      className={`flex-1 text-xs font-semibold py-2 px-2 rounded-xl border-2 transition-all duration-150 ${
                        form.priceType === pt.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
                {form.priceType !== 'CONTACT' && (
                  <div className="mt-2">
                    <Input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="0"
                      min="0"
                      hasError={!!errors.price}
                    />
                    {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
                  </div>
                )}
              </div>

              {/* Contact phone */}
              <FormField id="contactPhone" label="Teléfono de contacto" error={errors.contactPhone}>
                <Input
                  id="contactPhone"
                  value={form.contactPhone}
                  onChange={(e) => {
                    setForm(f => ({ ...f, contactPhone: e.target.value }));
                    if (e.target.value) setErrors(err => ({ ...err, contactPhone: '' }));
                  }}
                  placeholder="Ej: 3001234567"
                  maxLength={50}
                  className={errors.contactPhone ? 'border-red-300' : ''}
                />
              </FormField>

              {/* Images */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Imágenes ({uploadedKeys.length}/5)
                </label>
                {/* Thumbnails */}
                {uploadedUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {uploadedUrls.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {uploadedKeys.length < 5 && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {uploading ? (
                        <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      {uploading ? 'Subiendo...' : 'Agregar imágenes'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className={`mx-5 mb-5 bg-slate-50 p-4 rounded-xl border ${errors.terms ? 'border-red-300' : 'border-slate-200'}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (e.target.checked) setErrors(err => ({ ...err, terms: '' }));
                  }}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)]"
                />
                <div className="flex-1">
                  <span className="text-xs text-slate-600 leading-snug block">
                    Acepto los <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTerms(true); }} className="text-blue-600 underline font-semibold">términos y condiciones</button>. Entiendo que soy responsable del contenido, imágenes y veracidad de esta publicación. El administrador podrá ocultar o eliminar publicaciones que violen las normas de convivencia.
                  </span>
                  {errors.terms && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.terms}</p>}
                </div>
              </label>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-5 border-t border-slate-100 shrink-0">
              <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={isSubmitting}>
                ← Volver
              </Button>
              <SubmitButton isSubmitting={isSubmitting} loadingText="Publicando...">
                Publicar
              </SubmitButton>
            </div>
          </form>
        )}
      </div>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  );
}

// ─── Terms Modal ─────────────────────────────────────────────────────────────

function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <h3 className="text-base font-bold text-slate-900">Términos y Condiciones</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto text-sm text-slate-600 space-y-4">
          <p>Al utilizar el Marketplace de la comunidad, aceptas los siguientes términos:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Veracidad:</strong> Toda la información e imágenes proporcionadas deben ser reales y corresponder al artículo o servicio ofrecido.</li>
            <li><strong>Responsabilidad:</strong> Las transacciones se realizan directamente entre los residentes. La administración de la copropiedad y la plataforma no se hacen responsables por garantías, pagos, devoluciones ni disputas.</li>
            <li><strong>Contenido prohibido:</strong> Queda estrictamente prohibido publicar armas, sustancias ilegales, contenido ofensivo, fraudulento, o cualquier otro artículo o servicio que viole la ley o el manual de convivencia.</li>
            <li><strong>Moderación:</strong> La administración se reserva el derecho de ocultar o eliminar cualquier publicación que considere inapropiada o que incumpla estos términos, sin previo aviso.</li>
            <li><strong>Uso exclusivo:</strong> El Marketplace es para uso exclusivo de los residentes de la copropiedad. No se permite la comercialización masiva externa.</li>
          </ul>
          <p>El incumplimiento reiterado de estas normas puede resultar en la suspensión del acceso al módulo de Marketplace.</p>
        </div>
        <div className="p-5 border-t border-slate-100 flex justify-end shrink-0">
          <Button type="button" onClick={onClose}>Entendido</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ResidentMarketplace() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [reportingListing, setReportingListing] = useState<MarketplaceListing | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const PAGE_SIZE = 12;

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace', 'listings', selectedType, searchTerm, currentPage],
    queryFn: () => marketplaceService.getListings({
      type: selectedType || undefined,
      search: searchTerm || undefined,
      page: currentPage - 1,
      size: PAGE_SIZE,
    }),
  });

  const listings = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalElements = data?.totalElements ?? 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" style={{ color: 'var(--tenant-primary)' }} />
            Marketplace
          </h1>
          <p className="text-sm text-slate-500 mt-1">Compra, vende y ofrece servicios dentro de tu comunidad</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/resident/marketplace/my-listings"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ListChecks className="w-3.5 h-3.5" />
            Mis publicaciones
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--tenant-primary)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Publicar
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar en el marketplace..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button type="submit" className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--tenant-primary)' }}>
            Buscar
          </button>
        </form>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TYPE_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => handleTypeChange(tab.value)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              selectedType === tab.value
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="font-bold text-slate-700">No hay publicaciones</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">
            {searchTerm
              ? `No se encontraron resultados para "${searchTerm}"`
              : 'Sé el primero en publicar algo en el marketplace de tu comunidad.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setSearchInput(''); setCurrentPage(1); }}
              className="mt-3 text-xs font-semibold underline text-slate-500"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map(listing => (
            <ListingCard key={listing.id} listing={listing} onClick={() => setSelectedListing(listing)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            {totalElements} publicaciones · Página {currentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-xs font-semibold text-slate-700 px-2">{currentPage}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedListing && !reportingListing && (
        <ListingDetailModal
          listing={selectedListing}
          currentUserId={user?.id}
          onClose={() => setSelectedListing(null)}
          onReport={(l) => { setReportingListing(l); setSelectedListing(null); }}
        />
      )}
      {reportingListing && (
        <ReportModal
          listing={reportingListing}
          onClose={() => setReportingListing(null)}
          onSuccess={() => setReportingListing(null)}
        />
      )}
      {showCreateModal && (
        <CreateListingModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
