import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Wrench, Plus, Trash2, Edit, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import type { RequestPQRS } from '../../types';
import { requestSchema } from '../../validation/schemas/requestSchema';
import { validateForm } from '../../validation/validators/formValidator';
import { FormField } from '../../components/ui/FormField';
import { FormErrorSummary } from '../../components/ui/FormErrorSummary';
import { CharacterCounter } from '../../components/ui/CharacterCounter';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { notificationService } from '../../services/notificationService';
import { normalizeWhitespace } from '../../utils/sanitizers';
import { FIELD_LIMITS } from '../../validation/rules/limits';

export const ResidentRequests = () => {
  const { user, activePropertyId, userProperties } = useAuth() as any;
  const { currentTenant } = useTenant();
  const { pqrsList, createPQRS, updatePQRS, deletePQRS } = useData();

  const activeProperty = userProperties?.find((prop: any) => prop.propertyId === activePropertyId);
  const myPropertyId = activeProperty?.name || activeProperty?.number || activePropertyId || user?.propertyUnit || 'Mi Apartamento';
  const myResidentName = user?.name || 'Residente';
  const myRequests = pqrsList.filter(r => {
    if (activePropertyId && (r.propertyId === activePropertyId)) return true;
    if (activeProperty?.number && (r.propertyId === activeProperty.number)) return true;
    if (activeProperty?.name && (r.propertyId === activeProperty.name)) return true;
    if (!activePropertyId && user?.residentPropertyId && r.propertyId === user.residentPropertyId) return true;
    if (!activePropertyId && user?.propertyUnit && (r.propertyId === user.propertyUnit)) return true;
    return false;
  });

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RequestPQRS | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Plomería' as RequestPQRS['category'],
    priority: 'MEDIA' as 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ field: string; message: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreate = () => {
    setEditingRequest(null);
    setFormData({
      title: '',
      category: 'Plomería',
      priority: 'MEDIA',
      description: ''
    });
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (req: RequestPQRS) => {
    setEditingRequest(req);
    setFormData({
      title: req.title,
      category: req.category,
      priority: (req.priority?.toUpperCase() as any) || 'MEDIA',
      description: req.description
    });
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalized = {
      title: normalizeWhitespace(formData.title),
      description: normalizeWhitespace(formData.description),
      category: formData.category,
      priority: formData.priority,
      propertyId: myPropertyId,
    };

    const validation = validateForm(requestSchema, normalized);

    if (!validation.success) {
      setErrors(validation.errors);
      setErrorList(validation.errorList);
      return;
    }

    setErrors({});
    setErrorList([]);
    setIsSubmitting(true);

    try {
      await new Promise(r => setTimeout(r, 400));

      if (editingRequest) {
        updatePQRS(editingRequest.id, {
          title: normalized.title,
          description: normalized.description,
          category: normalized.category,
          priority: (normalized.priority.charAt(0) + normalized.priority.slice(1).toLowerCase()) as any,
        });
        notificationService.showToast('Solicitud actualizada correctamente', 'success');
      } else {
        createPQRS({
          title: normalized.title,
          description: normalized.description,
          category: normalized.category,
          priority: (normalized.priority.charAt(0) + normalized.priority.slice(1).toLowerCase()) as any,
          status: 'NEW',
          propertyId: myPropertyId,
          residentName: myResidentName,
          tenantId: currentTenant?.id || 'tenant-limonar'
        });
        notificationService.showToast('Solicitud radicada exitosamente', 'success');
      }

      setIsModalOpen(false);
    } catch {
      notificationService.showError('Error al guardar', 'No fue posible radicar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await notificationService.showConfirm(
      '¿Cancelar solicitud?',
      `¿Deseas eliminar la solicitud "${title}"? Esta acción no se puede deshacer.`,
      'Sí, eliminar',
      'Mantener'
    );

    if (confirmed) {
      deletePQRS(id);
      notificationService.showToast('Solicitud eliminada', 'success');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Mis Solicitudes y Daños</h2>
          <p className="text-slate-500 text-xs">Reporta averías o peticiones al equipo de administración.</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl text-xs shadow-sm">
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo Reporte
        </Button>
      </div>

      {/* Requests Feed */}
      <div className="space-y-3">
        {myRequests.map((req) => (
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
                  {req.status === 'NEW' ? 'Pendiente' : req.status === 'IN_PROGRESS' ? 'En Proceso' : 'Resuelta'}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-900 leading-snug">{req.title}</h4>
              <p className="text-xs text-slate-600 mt-1">{req.description}</p>

              {req.responseNotes && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-800">
                  <span className="font-bold block text-[11px]">Respuesta de Administración:</span>
                  {req.responseNotes}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Reportado: {req.createdAt}</span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(req)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Editar solicitud"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(req.id, req.title)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Eliminar solicitud"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}

        {myRequests.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            <Wrench className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No tienes reportes activos.</p>
            <p className="mt-1">Si necesitas mantenimiento en tu unidad o zona común, crea un reporte arriba.</p>
          </div>
        )}
      </div>

      {/* Modal Reportar / Editar Solicitud */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isSubmitting) setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingRequest ? 'Editar Solicitud' : 'Nuevo Reporte de Daño / PQRS'}
              </h3>
              <button 
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <FormErrorSummary errors={errorList} />

            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              {/* Plantillas rápidas para ahorrar tiempo */}
              {!editingRequest && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                  <span className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    ¿Es un problema frecuente? Usa una plantilla rápida:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { title: 'Fuga de agua en grifería / lavamanos', cat: 'Plomería', prio: 'MEDIA', desc: 'Presenta goteo continuo en la grifería del baño principal ocasionando desperdicio de agua.' },
                      { title: 'Bombillo fundido en pasillo / acceso', cat: 'Eléctrico', prio: 'BAJA', desc: 'La luminaria del pasillo frente a la puerta de la unidad se encuentra apagada/fundida.' },
                      { title: 'Cerradura o chapa trabada', cat: 'Daño en Zona Común', prio: 'ALTA', desc: 'La chapa de la puerta peatonal de acceso no gira suavemente y dificulta la entrada.' },
                      { title: 'Ruido excesivo fuera de horario', cat: 'Ruido / Convivencia', prio: 'MEDIA', desc: 'Se escuchan ruidos molestos y música a alto volumen pasadas las horas de descanso permitidas.' }
                    ].map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setFormData({
                            title: tpl.title,
                            category: tpl.cat as any,
                            priority: tpl.prio as any,
                            description: tpl.desc
                          });
                          setErrors({});
                        }}
                        className="text-[11px] font-medium bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors shadow-2xs text-left cursor-pointer"
                      >
                        ⚡ {tpl.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <FormField
                id="req-title"
                label="Título del reporte"
                required
                maxLength={FIELD_LIMITS.TITLE_MAX_LENGTH}
                currentLength={formData.title.length}
                error={errors.title}
              >
                <input
                  id="req-title"
                  name="title"
                  type="text"
                  maxLength={FIELD_LIMITS.TITLE_MAX_LENGTH}
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (errors.title) setErrors({ ...errors, title: '' });
                  }}
                  placeholder="Ej. Fuga de agua en el lavamanos principal"
                  aria-invalid={Boolean(errors.title)}
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                    errors.title ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                  }`}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="req-category"
                  label="Categoría"
                  required
                  error={errors.category}
                >
                  <select
                    id="req-category"
                    name="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Plomería">Plomería</option>
                    <option value="Eléctrico">Eléctrico</option>
                    <option value="Fachada/Paredes">Fachada/Paredes</option>
                    <option value="Daño en Zona Común">Daño en Zona Común</option>
                    <option value="Ruido / Convivencia">Ruido / Convivencia</option>
                    <option value="Petición Administrativa">Petición Administrativa</option>
                    <option value="Mascotas">Mascotas</option>
                    <option value="Otro">Otro</option>
                  </select>
                </FormField>

                <FormField
                  id="req-priority"
                  label="Prioridad"
                  required
                  error={errors.priority}
                >
                  <select
                    id="req-priority"
                    name="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="BAJA">Baja</option>
                    <option value="MEDIA">Media</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </FormField>
              </div>

              <FormField
                id="req-description"
                label="Descripción detallada del daño"
                required
                error={errors.description}
                helperText="Mínimo 10 caracteres."
                counter={
                  <CharacterCounter
                    current={formData.description.length}
                    max={FIELD_LIMITS.DESCRIPTION_MAX_LENGTH}
                    alwaysVisible
                  />
                }
              >
                <textarea
                  id="req-description"
                  name="description"
                  rows={4}
                  maxLength={FIELD_LIMITS.DESCRIPTION_MAX_LENGTH}
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (errors.description) setErrors({ ...errors, description: '' });
                  }}
                  placeholder="Describe con precisión qué ocurre, dónde está ubicado y cuándo comenzó..."
                  aria-invalid={Boolean(errors.description)}
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                    errors.description ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                  }`}
                />
              </FormField>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <SubmitButton
                  isSubmitting={isSubmitting}
                  loadingText="Radicando..."
                  className="rounded-xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white"
                >
                  {editingRequest ? 'Guardar Cambios' : 'Radicar Solicitud'}
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

