import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Search, Plus, Edit, Trash2, X, Users, Calendar, Megaphone, Send, ChevronLeft, ChevronRight, Eye, ArrowUpDown } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useTenant } from '../../contexts/TenantContext';
import type { Communication } from '../../types';
import { communicationSchema } from '../../validation/schemas/communicationSchema';
import { validateForm } from '../../validation/validators/formValidator';
import { FormField } from '../../components/ui/FormField';
import { FormErrorSummary } from '../../components/ui/FormErrorSummary';
import { CharacterCounter } from '../../components/ui/CharacterCounter';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { notificationService } from '../../services/notificationService';
import { normalizeWhitespace, normalizeMultilineText } from '../../utils/sanitizers';
import { formatDate } from '../../utils/formatters';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import { getStatusLabel } from '../../utils/statusLabels';
import { VisualAudienceSelector } from './components/VisualAudienceSelector';

const ITEMS_PER_PAGE = 8;

export const CommunicationsPage = () => {
  const { currentTenant } = useTenant();
  const { communications, createCommunication, updateCommunication, deleteCommunication, residents, properties } = useData();

  const tenantId = currentTenant?.id || 'tenant-limonar';
  const tenantCommunications = useMemo(() => {
    return communications.filter((c) => c.tenantId === tenantId);
  }, [communications, tenantId]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterAudience, setFilterAudience] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComm, setEditingComm] = useState<Communication | null>(null);
  const [viewingComm, setViewingComm] = useState<Communication | null>(null);
  const [audienceType, setAudienceType] = useState('Todos');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    authorName: 'Administración',
    audience: 'Todos' as Communication['audience'],
    category: 'General' as Communication['category'],
    status: 'PUBLISHED' as Communication['status']
  });

  const uniqueStructures = useMemo(() => {
    return Array.from(new Set(properties.map(p => p.structureName).filter(Boolean))) as string[];
  }, [properties]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ field: string; message: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredComms = useMemo(() => {
    const parseTime = (dateStr?: string) => {
      if (!dateStr) return 0;
      if (dateStr.toLowerCase() === 'hoy') return Date.now();
      const t = new Date(dateStr).getTime();
      return isNaN(t) ? 0 : t;
    };

    return tenantCommunications
      .filter(c => {
        const matchesSearch = !searchTerm || 
          c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          c.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAudience = filterAudience === 'Todos' || c.audience === filterAudience || (filterAudience === 'Todos' && c.audience === 'General');
        const matchesStatus = filterStatus === 'Todos' || c.status === filterStatus;
        return matchesSearch && matchesAudience && matchesStatus;
      })
      .sort((a, b) => {
        const diff = parseTime(b.createdAt) - parseTime(a.createdAt);
        return sortOrder === 'desc' ? diff : -diff;
      });
  }, [tenantCommunications, searchTerm, filterAudience, filterStatus, sortOrder]);

  const totalPages = Math.ceil(filteredComms.length / ITEMS_PER_PAGE) || 1;
  const paginatedComms = useMemo(() => {
    return filteredComms.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [filteredComms, currentPage]);

  const handleOpenCreate = () => {
    setEditingComm(null);
    setAudienceType('Todos');
    setFormData({
      title: '',
      content: '',
      authorName: currentTenant?.name ? `Admin ${currentTenant.name}` : 'Administración',
      audience: 'Todos',
      category: 'General',
      status: 'PUBLISHED'
    });
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (comm: Communication) => {
    setEditingComm(comm);
    const aud = comm.audience;
    if (['Todos', 'General', 'Propietarios', 'Arrendatarios'].includes(aud)) {
       setAudienceType(aud === 'General' ? 'Todos' : aud);
    } else {
       setAudienceType('Visual');
    }

    setFormData({
      title: comm.title,
      content: comm.content,
      authorName: comm.authorName,
      audience: comm.audience,
      category: comm.category || 'General',
      status: comm.status
    });
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalized = {
      title: normalizeWhitespace(formData.title),
      content: normalizeMultilineText(formData.content),
      audience: formData.audience,
      category: formData.category,
      status: formData.status,
    };

    const validation = validateForm(communicationSchema, normalized);

    if (!validation.success) {
      setErrors(validation.errors);
      setErrorList(validation.errorList);
      return;
    }

    // Confirmación para emisión masiva si es publicación nueva
    if (!editingComm && formData.status === 'PUBLISHED') {
      const confirmSend = await notificationService.showConfirm(
        '¿Publicar comunicado oficial?',
        `Vas a enviar esta comunicación a ${residents.length} residentes registrados en ${currentTenant?.name || 'la unidad'}.`,
        'Sí, publicar ahora',
        'Revisar'
      );
      if (!confirmSend) return;
    }

    setErrors({});
    setErrorList([]);
    setIsSubmitting(true);

    try {
      await new Promise(r => setTimeout(r, 400));

      if (editingComm) {
        updateCommunication(editingComm.id, {
          ...normalized,
          authorName: formData.authorName,
        });
        notificationService.showToast('Comunicado actualizado correctamente', 'success');
      } else {
        createCommunication({
          ...normalized,
          authorName: formData.authorName,
          tenantId: currentTenant?.id || 'tenant-limonar'
        });
        notificationService.showToast('Comunicado publicado exitosamente', 'success');
      }

      setIsModalOpen(false);
    } catch {
      notificationService.showError('Error al guardar', 'No fue posible guardar el comunicado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await notificationService.showConfirm(
      '¿Eliminar comunicado?',
      `¿Deseas retirar el comunicado "${title}" del muro de avisos?`,
      'Sí, eliminar',
      'Cancelar'
    );

    if (confirmed) {
      deleteCommunication(id);
      notificationService.showToast('Comunicado eliminado', 'success');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Muro de Comunicados</h2>
          <p className="text-slate-500 text-sm">Emite circulares oficiales, convocatorias de asamblea y avisos urgentes.</p>
        </div>
        <Button onClick={handleOpenCreate} className="shrink-0 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Comunicado
        </Button>
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
              placeholder="Buscar comunicados por título o contenido..." 
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
              value={filterAudience}
              onChange={(e) => {
                setFilterAudience(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="Todos">Toda audiencia</option>
              <option value="Propietarios">Propietarios</option>
              <option value="Arrendatarios">Arrendatarios</option>
              {uniqueStructures.map(s => (
                <option key={`filter-${s}`} value={s}>{s}</option>
              ))}
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
              <option value="Publicado">Publicado</option>
              <option value="Borrador">Borrador</option>
            </select>
          </div>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200 uppercase">
              <tr>
                <th className="px-6 py-3.5 font-semibold w-2/5 min-w-[240px]">Comunicado</th>
                <th className="px-6 py-3.5 font-semibold whitespace-nowrap">Audiencia</th>
                <th className="px-6 py-3.5 font-semibold whitespace-nowrap">Categoría</th>
                <th 
                  className="px-6 py-3.5 font-semibold whitespace-nowrap cursor-pointer hover:text-slate-800 transition-colors select-none group"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  title={`Orden actual: ${sortOrder === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}. Clic para cambiar.`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Fecha</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>
                </th>
                <th className="px-6 py-3.5 font-semibold whitespace-nowrap">Estado</th>
                <th className="px-6 py-3.5 font-semibold text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedComms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No se encontraron comunicados con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                paginatedComms.map((comm) => (
                  <tr key={comm.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 max-w-[260px] sm:max-w-xs md:max-w-sm">
                      <div className="flex items-start gap-3 min-w-0 max-w-full">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[var(--tenant-primary)] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          <Megaphone className="w-4 h-4" />
                        </div>
                        <div 
                          className="min-w-0 flex-1 overflow-hidden cursor-pointer group/item"
                          onClick={() => setViewingComm(comm)}
                          title="Clic para ver detalle"
                        >
                          <div className="font-bold text-slate-900 leading-snug truncate group-hover/item:text-[var(--tenant-primary)] transition-colors" title={comm.title}>
                            {comm.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1 break-all" title={comm.content}>
                            {comm.content}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {comm.audience}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs text-slate-700 font-medium">
                        {comm.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(comm.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        comm.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${comm.status === 'PUBLISHED' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {getStatusLabel(comm.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => setViewingComm(comm)}
                          className="p-1.5 text-slate-500 hover:text-[var(--tenant-primary)] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Ver comunicado"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(comm)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(comm.id, comm.title)}
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
        {filteredComms.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredComms.length)} de {filteredComms.length} comunicados
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

      {/* Modal Redactar / Editar Comunicado */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isSubmitting) setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                {editingComm ? 'Editar Circular' : 'Redactar Nuevo Comunicado'}
              </h3>
              <button 
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 py-4">
              <FormErrorSummary errors={errorList} />
              <form id="comm-form" onSubmit={handleSubmit} noValidate className="space-y-4">
              <FormField
                id="comm-title"
                label="Título del comunicado"
                required
                maxLength={FIELD_LIMITS.TITLE_MAX_LENGTH}
                currentLength={formData.title.length}
                error={errors.title}
              >
                <input
                  id="comm-title"
                  name="title"
                  type="text"
                  maxLength={FIELD_LIMITS.TITLE_MAX_LENGTH}
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (errors.title) setErrors({ ...errors, title: '' });
                  }}
                  placeholder="Ej. Convocatoria a Asamblea General Extraordinaria 2026"
                  aria-invalid={Boolean(errors.title)}
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                    errors.title ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                  }`}
                />
              </FormField>

              <div className="grid grid-cols-3 gap-3">
                <FormField
                  id="comm-audience-type"
                  label="Audiencia"
                  required
                  error={errors.audience}
                >
                  <select
                    id="comm-audience-type"
                    value={audienceType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAudienceType(val);
                      if (['Todos', 'Propietarios', 'Arrendatarios'].includes(val)) {
                         setFormData({ ...formData, audience: val as any });
                      } else if (val === 'Visual') {
                         setFormData({ ...formData, audience: '' });
                      }
                    }}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Todos">Toda la comunidad</option>
                    <option value="Propietarios">Solo Propietarios</option>
                    <option value="Arrendatarios">Solo Arrendatarios</option>
                    {properties.length > 0 && <option value="Visual">Selección Visual (Torres/Unidades)</option>}
                  </select>
                </FormField>

                <FormField
                  id="comm-category"
                  label="Categoría"
                  required
                  error={errors.category}
                >
                  <select
                    id="comm-category"
                    name="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="General">General</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Asamblea">Asamblea</option>
                    <option value="Seguridad">Seguridad</option>
                  </select>
                </FormField>

                <FormField
                  id="comm-status"
                  label="Estado"
                >
                  <select
                    id="comm-status"
                    name="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="PUBLISHED">Publicado</option>
                    <option value="DRAFT">Borrador</option>
                  </select>
                </FormField>
              </div>

              {audienceType === 'Visual' && (
                <FormField id="comm-audience-visual" label="Seleccionar Estructuras o Unidades">
                  <VisualAudienceSelector
                    properties={properties}
                    selectedAudiences={formData.audience ? formData.audience.split(',').map(s => s.trim()) : []}
                    onChange={(audiences) => setFormData({ ...formData, audience: audiences.join(', ') })}
                  />
                  {formData.audience && (
                    <p className="text-xs font-semibold text-[var(--tenant-primary)] mt-2">
                      Seleccionados: {formData.audience.split(',').length}
                    </p>
                  )}
                </FormField>
              )}

              <FormField
                id="comm-content"
                label="Contenido del comunicado"
                required
                error={errors.content}
                helperText="Mínimo 10 caracteres."
                counter={
                  <CharacterCounter
                    current={formData.content.length}
                    max={FIELD_LIMITS.DESCRIPTION_MAX_LENGTH}
                    alwaysVisible
                  />
                }
              >
                <textarea
                  id="comm-content"
                  name="content"
                  rows={4}
                  maxLength={FIELD_LIMITS.DESCRIPTION_MAX_LENGTH}
                  value={formData.content}
                  onChange={(e) => {
                    setFormData({ ...formData, content: e.target.value });
                    if (errors.content) setErrors({ ...errors, content: '' });
                  }}
                  placeholder="Redacta el mensaje oficial para la comunidad..."
                  aria-invalid={Boolean(errors.content)}
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                    errors.content ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                  }`}
                />
              </FormField>

              </form>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
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
                form="comm-form"
                isSubmitting={isSubmitting}
                loadingText="Publicando..."
                className="rounded-xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white"
              >
                {editingComm ? 'Guardar Cambios' : 'Publicar Comunicado'}
              </SubmitButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Detalle Comunicado */}
      {viewingComm && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setViewingComm(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setViewingComm(null); }}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0 gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[var(--tenant-primary)] flex items-center justify-center shrink-0 mt-0.5">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-[var(--tenant-primary)] bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                    {viewingComm.category || 'General'}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 leading-snug mt-1 break-words [overflow-wrap:anywhere]">
                    {viewingComm.title}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setViewingComm(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar vista"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Metadata Badges */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatDate(viewingComm.createdAt)}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {viewingComm.audience}
                </span>
                <span className="text-slate-300">•</span>
                <span>Por: <strong className="text-slate-700">{viewingComm.authorName}</strong></span>
                <span className="text-slate-300">•</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  viewingComm.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${viewingComm.status === 'PUBLISHED' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {getStatusLabel(viewingComm.status)}
                </span>
              </div>

              {/* Contenido Completo */}
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 text-sm text-slate-700 whitespace-pre-line break-words [overflow-wrap:anywhere] leading-relaxed">
                {viewingComm.content}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setViewingComm(null)}
                className="rounded-xl"
              >
                Cerrar
              </Button>
              <Button 
                type="button" 
                onClick={() => {
                  const comm = viewingComm;
                  setViewingComm(null);
                  handleOpenEdit(comm);
                }}
                className="rounded-xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white"
              >
                <Edit className="w-4 h-4 mr-1.5" /> Editar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
