import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Wrench, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useActiveUnit } from '../../hooks/useActiveUnit';
import { requestSchema } from '../../validation/schemas/requestSchema';
import { validateForm } from '../../validation/validators/formValidator';
import { FormField } from '../../components/ui/FormField';
import { FormErrorSummary } from '../../components/ui/FormErrorSummary';
import { CharacterCounter } from '../../components/ui/CharacterCounter';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { notificationService } from '../../services/notificationService';
import { normalizeWhitespace } from '../../utils/sanitizers';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import { pqrsService } from '../../services/pqrsService';
import { formatFriendlyDateTime } from '../../utils/formatters';

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

export const ResidentRequests = () => {
  const { activeUnitId, activeLabel } = useActiveUnit();
  const { currentTenant } = useTenant();

  const [pqrsList, setPqrsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Ordenar solicitudes por fecha descendente (más recientes primero)
  const sortedPqrs = useMemo(() => {
    return [...pqrsList].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [pqrsList]);

  const totalPages = Math.max(1, Math.ceil(sortedPqrs.length / ITEMS_PER_PAGE));
  const paginatedPqrs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedPqrs.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedPqrs, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  // Fase 2 / E2: la unidad activa de useActiveUnit (sin fallback a user.residentPropertyId).
  const myPropertyUUID = activeUnitId;
  const myPropertyDisplay = activeLabel || 'Mi unidad';

  const loadMyPqrs = async () => {
    if (!myPropertyUUID) return;
    try {
      setIsLoading(true);
      const res = await pqrsService.findByProperty(myPropertyUUID);
      setPqrsList(res || []);
    } catch (err: any) {
      console.error(err);
      notificationService.showError('Error', 'No se pudieron cargar tus solicitudes PQRS');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMyPqrs();
  }, [myPropertyUUID]);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Plomería',
    priority: 'MEDIA' as 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{field: string, message: string}>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      category: 'Plomería',
      priority: 'MEDIA',
      description: '',
    });
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const applyTemplate = (template: { category: string; title: string; desc: string }) => {
    setFormData(prev => ({
      ...prev,
      category: template.category as any,
      title: template.title,
      description: template.desc,
      priority: 'MEDIA'
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !myPropertyUUID) return;

    const normalized = {
      title: normalizeWhitespace(formData.title),
      description: normalizeWhitespace(formData.description),
      category: formData.category,
      priority: formData.priority,
      propertyId: myPropertyUUID,
    };

    const validationResult = validateForm(requestSchema, normalized);
    setErrors(validationResult.errors);
    setErrorList(validationResult.errorList || []);

    if (validationResult.success) {
      setIsSubmitting(true);
      try {
        await pqrsService.create({
          propertyId: myPropertyUUID,
          category: normalized.category,
          title: normalized.title,
          description: normalized.description,
          priority: normalized.priority === 'MEDIA' ? 'MEDIUM' : normalized.priority === 'ALTA' ? 'HIGH' : normalized.priority === 'URGENTE' ? 'URGENT' : 'LOW'
        });
        
        notificationService.showToast('Solicitud radicada exitosamente', 'success');
        setIsModalOpen(false);
        setCurrentPage(1);
        await loadMyPqrs();
      } catch (error: any) {
        notificationService.showError('Error', error?.message || 'No se pudo guardar la solicitud.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const firstErrorField = Object.keys(validationResult.errors)[0];
      const el = document.getElementById(firstErrorField);
      if (el) el.focus();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Mis Solicitudes y Daños ({sortedPqrs.length})</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Reporta averías o peticiones al equipo de administración.</p>
        </div>
        <Button 
          onClick={handleOpenCreate} 
          className="bg-[var(--tenant-primary)] hover:opacity-90 transition-opacity rounded-xl flex-1 sm:flex-none py-2 px-4 shadow-sm font-semibold h-9 shadow-[var(--tenant-primary)]/20"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nuevo Reporte
        </Button>
      </div>

      {/* Requests Feed */}
      <div className="space-y-3">
        {isLoading && pqrsList.length === 0 && (
          <div className="p-8 text-center text-slate-500">Cargando tus solicitudes...</div>
        )}

        {paginatedPqrs.map((req) => (
          <Card key={req.id} className="p-4 rounded-2xl border border-slate-200/80 shadow-xs bg-white flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                  {req.category}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  req.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                  req.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                  'bg-rose-100 text-rose-800'
                }`}>
                  {req.status === 'NEW' || req.status === 'PENDING' ? 'Pendiente' : req.status === 'IN_PROGRESS' ? 'En Proceso' : 'Resuelta'}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-900 leading-tight pr-4">{req.title}</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{req.description}</p>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-bold text-slate-500">
                  Radicado: <span className="font-semibold text-slate-700">{formatFriendlyDateTime(req.createdAt)}</span>
                </div>
              </div>
            </div>

            {req.responseNotes && (
              <div className="mt-2 text-xs bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50 text-slate-600">
                <span className="font-bold text-blue-800 block mb-0.5">Respuesta de Admin:</span>
                {req.responseNotes}
              </div>
            )}
          </Card>
        ))}

        {!isLoading && sortedPqrs.length > 0 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedPqrs.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            itemName="solicitudes"
          />
        )}

        {!isLoading && pqrsList.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            <Wrench className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No tienes reportes activos.</p>
            <p className="mt-1">Si necesitas mantenimiento en tu unidad o zona común, crea un reporte arriba.</p>
          </div>
        )}
      </div>

      {/* Modal Reportar Solicitud */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isSubmitting) setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Nuevo Reporte de Daño / PQRS</h3>
              <button 
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <FormErrorSummary errors={errorList} />

            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              {/* Plantillas rápidas para ahorrar tiempo */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                <span className="block text-[11px] font-bold text-slate-500 mb-1.5">¿Es un problema frecuente? Usa una plantilla rápida:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => applyTemplate({ category: 'Plomería', title: 'Fuga de Agua', desc: 'Hay una fuga de agua en mi apartamento y necesito revisión.' })} className="text-[10px] px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition-colors cursor-pointer">Fuga de Agua</button>
                  <button type="button" onClick={() => applyTemplate({ category: 'Eléctrico', title: 'Corte de Luz Localizado', desc: 'Tengo un taco saltado o un área sin energía que no puedo solucionar.' })} className="text-[10px] px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition-colors cursor-pointer">Sin Energía</button>
                  <button type="button" onClick={() => applyTemplate({ category: 'Aseo / Zonas Comunes', title: 'Lámpara Fundida en Pasillo', desc: 'La lámpara de mi pasillo está fundida.' })} className="text-[10px] px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition-colors cursor-pointer">Luz Pasillo</button>
                  <button type="button" onClick={() => applyTemplate({ category: 'Aseo / Zonas Comunes', title: 'Aseo en Pasillo / Zona Común', desc: 'Se requiere limpieza y aseo en el pasillo o área común de la torre.' })} className="text-[10px] px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition-colors cursor-pointer">Aseo Pasillo</button>
                </div>
              </div>

              <FormField id="category" label="Categoría de la Solicitud" error={errors.category}>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-[var(--tenant-primary)]/20 focus:border-[var(--tenant-primary)] outline-none cursor-pointer"
                  disabled={isSubmitting}
                >
                  <option value="Plomería">Plomería</option>
                  <option value="Eléctrico">Eléctrico</option>
                  <option value="Aseo / Zonas Comunes">Aseo / Zonas Comunes</option>
                  <option value="Daño en Zona Común">Daño en Zona Común</option>
                  <option value="Ruido / Convivencia">Queja de Convivencia</option>
                  <option value="Fachada/Paredes">Fachada / Paredes</option>
                  <option value="Petición Administrativa">Petición Administrativa</option>
                  <option value="Otro">Otro (Sugerencias, etc)</option>
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField id="title" label="Asunto Breve" error={errors.title} className="col-span-2">
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary)]/20 focus:border-[var(--tenant-primary)] outline-none"
                    placeholder="Ej. Filtración de agua en baño"
                    disabled={isSubmitting}
                    maxLength={FIELD_LIMITS.TITLE_MAX_LENGTH}
                  />
                  <CharacterCounter current={formData.title.length} max={FIELD_LIMITS.TITLE_MAX_LENGTH} />
                </FormField>

                <FormField id="priority" label="Nivel de Urgencia" error={errors.priority} className="col-span-2">
                  <div className="flex rounded-xl overflow-hidden border border-slate-200 p-1 bg-slate-50 gap-1">
                    {['BAJA', 'MEDIA', 'ALTA', 'URGENTE'].map(p => (
                      <button
                        key={p}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setFormData({ ...formData, priority: p as any })}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                          formData.priority === p 
                            ? 'bg-white shadow-sm text-slate-800 border border-slate-200/50' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </FormField>
              </div>

              <FormField id="description" label="Descripción del Problema" error={errors.description}>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-3 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary)]/20 focus:border-[var(--tenant-primary)] outline-none resize-none"
                  placeholder="Detalla exactamente qué sucede, desde cuándo y en qué parte específica..."
                  rows={4}
                  disabled={isSubmitting}
                  maxLength={FIELD_LIMITS.DESCRIPTION_MAX_LENGTH}
                />
                <CharacterCounter current={formData.description.length} max={FIELD_LIMITS.DESCRIPTION_MAX_LENGTH} />
              </FormField>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={isSubmitting}
                  className="flex-1 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 h-10 font-bold"
                >
                  Cancelar
                </Button>
                <SubmitButton
                  isSubmitting={isSubmitting}
                  loadingText="Radicando..."
                  className="rounded-xl bg-[var(--tenant-primary)] hover:opacity-90 text-white"
                >
                  Radicar Solicitud
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
