import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Search, Plus, Wrench, AlertTriangle, CheckCircle2, Clock, Edit, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useTenant } from '../../contexts/TenantContext';
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

const ITEMS_PER_PAGE = 8;

export const AdminRequests = () => {
  const { currentTenant } = useTenant();
  const { pqrsList, createPQRS, updatePQRS, deletePQRS, resolvePQRS, properties } = useData();

  const tenantId = currentTenant?.id || 'tenant-limonar';
  const tenantPQRS = useMemo(() => {
    return pqrsList.filter((p) => p.tenantId === tenantId);
  }, [pqrsList, tenantId]);

  const tenantProperties = useMemo(() => {
    return properties.filter((p) => p.tenantId === tenantId);
  }, [properties, tenantId]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPQRS, setEditingPQRS] = useState<RequestPQRS | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Plomería' as RequestPQRS['category'],
    priority: 'MEDIA' as 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE',
    status: 'NEW' as RequestPQRS['status'],
    propertyId: tenantProperties[0]?.name || 'Torre 1 - 101',
    residentName: tenantProperties[0]?.residentName || 'Residente',
    responseNotes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ field: string; message: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Resolve Modal
  const [resolveModalId, setResolveModalId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const filteredPQRS = tenantPQRS.filter(req => {
    const matchesSearch = !searchTerm ||
      req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.propertyId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'Todos' || req.category === filterCategory;
    const matchesStatus = filterStatus === 'Todos' || req.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPQRS.length / ITEMS_PER_PAGE) || 1;
  const paginatedPQRS = filteredPQRS.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleOpenCreate = () => {
    setEditingPQRS(null);
    setFormData({
      title: '',
      description: '',
      category: 'Plomería',
      priority: 'MEDIA',
      status: 'NEW',
      propertyId: tenantProperties[0]?.name || 'Torre 1 - 101',
      residentName: tenantProperties[0]?.residentName || 'Residente',
      responseNotes: ''
    });
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (req: RequestPQRS) => {
    setEditingPQRS(req);
    setFormData({
      title: req.title,
      description: req.description,
      category: req.category,
      priority: (req.priority?.toUpperCase() as any) || 'MEDIA',
      status: req.status,
      propertyId: req.propertyId,
      residentName: req.residentName,
      responseNotes: req.responseNotes || ''
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
      propertyId: formData.propertyId.trim(),
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

      const priorityFormatted = (normalized.priority.charAt(0) + normalized.priority.slice(1).toLowerCase()) as any;

      if (editingPQRS) {
        updatePQRS(editingPQRS.id, {
          title: normalized.title,
          description: normalized.description,
          category: normalized.category,
          priority: priorityFormatted,
          status: formData.status,
          propertyId: normalized.propertyId,
          residentName: formData.residentName.trim(),
          responseNotes: formData.responseNotes ? normalizeWhitespace(formData.responseNotes) : undefined,
        });
        notificationService.showToast('Solicitud actualizada correctamente', 'success');
      } else {
        createPQRS({
          title: normalized.title,
          description: normalized.description,
          category: normalized.category,
          priority: priorityFormatted,
          status: formData.status,
          propertyId: normalized.propertyId,
          residentName: formData.residentName.trim(),
          tenantId: currentTenant?.id || 'tenant-limonar'
        });
        notificationService.showToast('Solicitud registrada exitosamente', 'success');
      }

      setIsModalOpen(false);
    } catch {
      notificationService.showError('Error al guardar', 'No fue posible guardar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModalId) return;

    if (resolveNotes.trim().length < 5) {
      notificationService.showError('Nota requerida', 'Por favor describe brevemente la solución aplicada (mínimo 5 caracteres).');
      return;
    }

    setIsResolving(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      resolvePQRS(resolveModalId, normalizeWhitespace(resolveNotes));
      notificationService.showToast('Caso marcado como resuelto', 'success');
      setResolveModalId(null);
      setResolveNotes('');
    } finally {
      setIsResolving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await notificationService.showConfirm(
      '¿Eliminar solicitud?',
      `¿Estás seguro de eliminar el reporte "${title}"? Esta acción no se puede deshacer.`,
      'Sí, eliminar',
      'Cancelar'
    );

    if (confirmed) {
      deletePQRS(id);
      notificationService.showToast('Reporte eliminado', 'success');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">PQRS, Daños y Mantenimiento</h2>
          <p className="text-slate-500 text-sm">Gestiona peticiones, quejas, reclamos y solicitudes de reparaciones locativas.</p>
        </div>
        <Button onClick={handleOpenCreate} className="shrink-0 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Nueva Solicitud
        </Button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-rose-600">{pqrsList.filter(p => p.status === 'NEW').length}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Nuevas sin atender</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-amber-600">{pqrsList.filter(p => p.status === 'IN_PROGRESS').length}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">En proceso / técnico</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-emerald-600">{pqrsList.filter(p => p.status === 'RESOLVED').length}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Resueltas</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-slate-900">{pqrsList.length}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Total radicadas</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden border border-slate-200/80 rounded-2xl shadow-sm bg-white">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 bg-slate-50/70">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="search"
              maxLength={FIELD_LIMITS.SEARCH_MAX_LENGTH}
              placeholder="Buscar por caso, descripción, solicitante o unidad..." 
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[var(--tenant-primary)]"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="Todos">Todas las categorías</option>
              <option value="Plomería">Plomería</option>
              <option value="Eléctrico">Eléctrico</option>
              <option value="Fachada/Paredes">Fachada/Paredes</option>
              <option value="Daño en Zona Común">Daño en Zona Común</option>
              <option value="Ruido / Convivencia">Ruido / Convivencia</option>
              <option value="Petición Administrativa">Petición Administrativa</option>
              <option value="Otro">Otro</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="Todos">Todos los estados</option>
              <option value="NEW">Nueva</option>
              <option value="IN_PROGRESS">En Proceso</option>
              <option value="RESOLVED">Resuelta</option>
            </select>
          </div>
        </div>
        
        {/* Mobile Cards List (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {paginatedPQRS.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No se encontraron solicitudes con los filtros seleccionados.
            </div>
          ) : (
            paginatedPQRS.map((req) => (
              <div key={req.id} className="p-4 space-y-3 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">{req.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {req.propertyId}
                      </span>
                      <span className="text-xs text-slate-500 font-medium truncate">
                        {req.residentName}
                      </span>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    req.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    req.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      req.status === 'RESOLVED' ? 'bg-emerald-500' :
                      req.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-rose-500'
                    }`} />
                    {req.status === 'NEW' ? 'Nueva' : req.status === 'IN_PROGRESS' ? 'En Proceso' : 'Resuelta'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">
                  {req.description}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                    {req.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    (req.priority as string) === 'Alta' || (req.priority as string) === 'Crítica' || (req.priority as string) === 'ALTA' || (req.priority as string) === 'URGENTE'
                      ? 'bg-rose-50 text-rose-700'
                      : (req.priority as string) === 'Media' || (req.priority as string) === 'MEDIA'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    Prioridad {req.priority}
                  </span>
                </div>

                {req.responseNotes && (
                  <div className="text-xs text-emerald-800 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-100">
                    <span className="font-semibold block text-[10px] uppercase text-emerald-600 mb-0.5">Solución registrada</span>
                    {req.responseNotes}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {req.status !== 'RESOLVED' && (
                    <button
                      onClick={() => { setResolveModalId(req.id); setResolveNotes(''); }}
                      className="flex-1 min-h-[40px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Resolver
                    </button>
                  )}
                  <button 
                    onClick={() => handleOpenEdit(req)}
                    className="min-h-[40px] px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(req.id, req.title)}
                    className="min-h-[40px] px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Table for Tablet and Desktop (md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200 uppercase">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Caso / Título</th>
                <th className="px-6 py-3.5 font-semibold">Unidad & Residente</th>
                <th className="px-6 py-3.5 font-semibold">Categoría</th>
                <th className="px-6 py-3.5 font-semibold">Prioridad</th>
                <th className="px-6 py-3.5 font-semibold">Estado</th>
                <th className="px-6 py-3.5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPQRS.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No se encontraron solicitudes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedPQRS.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-slate-900">{req.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{req.description}</div>
                        {req.responseNotes && (
                          <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                            Solución: {req.responseNotes}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{req.propertyId}</div>
                      <div className="text-xs text-slate-400">{req.residentName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                        {req.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        (req.priority as string) === 'Alta' || (req.priority as string) === 'Crítica' || (req.priority as string) === 'ALTA' || (req.priority as string) === 'URGENTE'
                          ? 'bg-rose-50 text-rose-700'
                          : (req.priority as string) === 'Media' || (req.priority as string) === 'MEDIA'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        req.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        req.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          req.status === 'RESOLVED' ? 'bg-emerald-500' :
                          req.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-rose-500'
                        }`} />
                        {req.status === 'NEW' ? 'Nueva' : req.status === 'IN_PROGRESS' ? 'En Proceso' : 'Resuelta'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {req.status !== 'RESOLVED' && (
                          <button
                            onClick={() => { setResolveModalId(req.id); setResolveNotes(''); }}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="Resolver caso"
                          >
                            Resolver
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenEdit(req)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(req.id, req.title)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredPQRS.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredPQRS.length)} de {filteredPQRS.length} solicitudes
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Crear / Editar PQRS */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isSubmitting) setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPQRS ? 'Editar Caso / Solicitud' : 'Registrar Nueva PQRS'}
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
              <FormField
                id="admin-req-title"
                label="Título de la solicitud"
                required
                maxLength={FIELD_LIMITS.TITLE_MAX_LENGTH}
                currentLength={formData.title.length}
                error={errors.title}
              >
                <input
                  id="admin-req-title"
                  name="title"
                  type="text"
                  maxLength={FIELD_LIMITS.TITLE_MAX_LENGTH}
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (errors.title) setErrors({ ...errors, title: '' });
                  }}
                  placeholder="Ej. Filtración de agua en parqueadero sótano 1"
                  aria-invalid={Boolean(errors.title)}
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                    errors.title ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                  }`}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="admin-req-property"
                  label="Unidad / Propiedad"
                  required
                  error={errors.propertyId}
                >
                  <select
                    id="admin-req-property"
                    name="propertyId"
                    value={formData.propertyId}
                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {properties.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  id="admin-req-resident"
                  label="Nombre del solicitante"
                  maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                  currentLength={formData.residentName.length}
                >
                  <input
                    id="admin-req-resident"
                    name="residentName"
                    type="text"
                    maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                    value={formData.residentName}
                    onChange={(e) => setFormData({ ...formData, residentName: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormField
                  id="admin-req-category"
                  label="Categoría"
                  required
                  error={errors.category}
                >
                  <select
                    id="admin-req-category"
                    name="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Plomería">Plomería</option>
                    <option value="Eléctrico">Eléctrico</option>
                    <option value="Fachada/Paredes">Fachada</option>
                    <option value="Daño en Zona Común">Zona Común</option>
                    <option value="Ruido / Convivencia">Convivencia</option>
                    <option value="Petición Administrativa">Admin</option>
                    <option value="Otro">Otro</option>
                  </select>
                </FormField>

                <FormField
                  id="admin-req-priority"
                  label="Prioridad"
                  required
                  error={errors.priority}
                >
                  <select
                    id="admin-req-priority"
                    name="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="BAJA">Baja</option>
                    <option value="MEDIA">Media</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </FormField>

                <FormField
                  id="admin-req-status"
                  label="Estado"
                >
                  <select
                    id="admin-req-status"
                    name="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="NEW">Nueva</option>
                    <option value="IN_PROGRESS">En Proceso</option>
                    <option value="RESOLVED">Resuelta</option>
                  </select>
                </FormField>
              </div>

              <FormField
                id="admin-req-description"
                label="Descripción del problema"
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
                  id="admin-req-description"
                  name="description"
                  rows={3}
                  maxLength={FIELD_LIMITS.DESCRIPTION_MAX_LENGTH}
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (errors.description) setErrors({ ...errors, description: '' });
                  }}
                  placeholder="Descripción completa..."
                  aria-invalid={Boolean(errors.description)}
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                    errors.description ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                  }`}
                />
              </FormField>

              {editingPQRS && (
                <FormField
                  id="admin-req-response"
                  label="Notas de resolución"
                  counter={
                    <CharacterCounter
                      current={formData.responseNotes.length}
                      max={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH}
                    />
                  }
                >
                  <input
                    id="admin-req-response"
                    name="responseNotes"
                    type="text"
                    maxLength={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH}
                    value={formData.responseNotes}
                    onChange={(e) => setFormData({ ...formData, responseNotes: e.target.value })}
                    placeholder="Ej. Se reparó la tubería y se verificó presión."
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </FormField>
              )}

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
                  loadingText="Guardando..."
                  className="rounded-xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white"
                >
                  {editingPQRS ? 'Guardar Cambios' : 'Registrar Solicitud'}
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLVE QUICK MODAL */}
      {resolveModalId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isResolving) setResolveModalId(null); }}
        >
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Marcar Caso como Resuelto
              </h3>
              <button 
                onClick={() => !isResolving && setResolveModalId(null)} 
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <p className="text-xs text-slate-600">
                Describe brevemente la solución que se le dio a la solicitud para que el residente quede enterado.
              </p>

              <FormField
                id="resolve-notes"
                label="Resumen de la solución"
                required
                counter={
                  <CharacterCounter
                    current={resolveNotes.length}
                    max={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH}
                    alwaysVisible
                  />
                }
              >
                <textarea
                  id="resolve-notes"
                  rows={3}
                  maxLength={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH}
                  placeholder="Ej. Técnico envió informe de reparación de fuga y cambio de empaques."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 resize-none"
                />
              </FormField>

              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setResolveModalId(null)}
                  disabled={isResolving}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <SubmitButton
                  isSubmitting={isResolving}
                  loadingText="Resolviendo..."
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                >
                  Confirmar Solución
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
