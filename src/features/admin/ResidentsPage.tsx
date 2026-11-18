import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Search, Plus, Filter, Edit, Trash2, X, Phone, Mail, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { residentApi } from '../../api/residentApi';
import { ApiError } from '../../api/apiClient';
import { statusLabel, unitLabel } from './residentFormat';
import { ALL_STRUCTURES, structureOptions, structureQueryParam } from './structureFilter';
import { StructureFilterSelect } from './StructureFilterSelect';
import { propertyApi } from '../../api/propertyApi';
import { useTenant } from '../../contexts/TenantContext';
import type { Resident } from '../../types';
import { residentSchema } from '../../validation/schemas/residentSchema';
import { validateForm } from '../../validation/validators/formValidator';
import { FormField } from '../../components/ui/FormField';
import { FormErrorSummary } from '../../components/ui/FormErrorSummary';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { notificationService } from '../../services/notificationService';
import { normalizeEmail, normalizePhone, normalizeWhitespace, sanitizeEmailInput } from '../../utils/sanitizers';
import { formatPhoneInput } from '../../utils/formatters';
import { FIELD_LIMITS } from '../../validation/rules/limits';

const ITEMS_PER_PAGE = 8;

export const ResidentsPage = () => {
  const { currentTenant } = useTenant();
    
  
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id || 'tenant-limonar';
  
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ field: string; message: string }>>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    propertyId: '',
    type: 'Propietario',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });
  const [unitSearch, setUnitSearch] = useState('');


  const [currentPage, setCurrentPage] = useState(1);

  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  // D-5: el Directorio muestra por defecto solo residentes activos; INACTIVE o todos para consultar el historial.
  const [filterStatus, setFilterStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  // Fase 2 / E4 (D7): estructura por id ('ALL' = todas, 'NONE' = sin estructura).
  const [filterStructure, setFilterStructure] = useState<string>(ALL_STRUCTURES);

  // Alta (POST) y edición (PUT /residents/{id}); los avisos dependen del resultado real (#2, #9).
  const saveResident = useMutation({
    mutationFn: (payload: { id?: string; data: any }) =>
      payload.id ? residentApi.update(payload.id, payload.data) : residentApi.create(payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
    }
  });

  // Baja lógica (A-8): el registro queda INACTIVE con su historial. El aviso depende del resultado real.
  const { mutate: deleteResident } = useMutation({
    mutationFn: residentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      notificationService.showToast('Residente dado de baja', 'success');
    },
    onError: () => {
      notificationService.showError('No se pudo dar de baja', 'Ocurrió un error al dar de baja al residente. Inténtalo de nuevo.');
    }
  });

  // Filtros, paginación y total se resuelven en el backend (TASK-008): la página nunca se calcula en memoria.
  const { data: residentPage, isLoading: residentsLoading } = useQuery({
    queryKey: ['residents', currentPage, searchTerm, filterStatus, filterType, filterStructure],
    queryFn: () => residentApi.findAll(currentPage - 1, ITEMS_PER_PAGE, searchTerm, {
      status: filterStatus === 'ALL' ? undefined : filterStatus,
      type: filterType === 'Todos' ? undefined : filterType,
      structureId: structureQueryParam(filterStructure),
    })
  });
  
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertyApi.findAll()
  });
  // Opciones del filtro por estructura a partir de las unidades ya cargadas (sin petición adicional).
  const structureFilter = useMemo(() => structureOptions(properties), [properties]);

  const paginatedResidents = residentPage?.content || [];
  const totalElements = residentPage?.totalElements ?? 0;
  const totalPages = Math.max(1, residentPage?.totalPages || 1);
  const firstShown = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const lastShown = Math.min(currentPage * ITEMS_PER_PAGE, totalElements);

  // Si una baja o un filtro deja la página actual fuera de rango, se vuelve a la última página con datos.
  useEffect(() => {
    if (residentPage && totalElements > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [residentPage, totalElements, totalPages, currentPage]);
  const tenantProperties = properties;
  // Opciones del selector de unidad; la seleccionada se mantiene aunque no coincida con la búsqueda.
  const unitOptions = useMemo(() => {
    const term = unitSearch.trim().toLowerCase();
    return [...tenantProperties]
      .filter((p) => !term || p.id === formData.propertyId || unitLabel(p).toLowerCase().includes(term))
      .sort((a, b) => unitLabel(a).localeCompare(unitLabel(b), 'es', { numeric: true }));
  }, [tenantProperties, unitSearch, formData.propertyId]);


  const handleOpenCreate = () => {
    setEditingResident(null);
    setFormData({
      name: '',
      propertyId: '',
      type: 'Propietario',
      phone: '',
      email: '',
      status: 'ACTIVE'
    });
    setUnitSearch('');
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (resident: Resident) => {
    setEditingResident(resident);
    setFormData({
      name: resident.name,
      propertyId: resident.propertyId,
      type: resident.type,
      phone: resident.phone,
      email: resident.email,
      status: resident.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });
    setUnitSearch('');
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Normalización de datos antes de validar
    const normalizedData = {
      name: normalizeWhitespace(formData.name),
      email: normalizeEmail(formData.email),
      phone: normalizePhone(formData.phone),
      propertyId: formData.propertyId,
      type: formData.type,
    };

    const validation = validateForm(residentSchema, normalizedData);

    if (!validation.success) {
      setErrors(validation.errors);
      setErrorList(validation.errorList);
      return;
    }

    setErrors({});
    setErrorList([]);
    setIsSubmitting(true);

    try {
      if (editingResident) {
        await saveResident.mutateAsync({
          id: editingResident.id,
          data: { ...normalizedData, status: formData.status },
        });
        notificationService.showToast('Residente actualizado correctamente', 'success');
      } else {
        // CreateResidentRequest no admite estado: el backend siempre crea ACTIVE.
        await saveResident.mutateAsync({ data: normalizedData });
        notificationService.showToast('Residente registrado exitosamente', 'success');
      }
      setIsModalOpen(false);
    } catch (err) {
      // El modal sigue abierto para corregir y reintentar.
      const detail = err instanceof ApiError && err.message ? err.message : 'Ocurrió un error al guardar el residente.';
      notificationService.showError('No se pudo guardar', detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await notificationService.showConfirm(
      '¿Dar de baja al residente?',
      `"${name}" perderá el acceso a esta unidad. Su historial (reservas, PQRS, pagos y votaciones) se conserva y la administración puede reactivarlo.`,
      'Sí, dar de baja',
      'Cancelar'
    );

    if (confirmed) {
      deleteResident(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Directorio de Residentes</h2>
          <p className="text-slate-500 text-sm">Crea, edita y administra los propietarios y arrendatarios de la unidad.</p>
        </div>
        <Button onClick={handleOpenCreate} className="shrink-0 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Residente
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
              aria-label="Buscar residentes"
              placeholder="Buscar por nombre, apartamento o correo..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[var(--tenant-primary)]"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <StructureFilterSelect
              value={filterStructure}
              onChange={(value) => {
                setFilterStructure(value);
                setCurrentPage(1);
              }}
              options={structureFilter.options}
              hasUnitsWithoutStructure={structureFilter.hasUnitsWithoutStructure}
            />
            <select
              aria-label="Filtrar por tipo"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Propietario">Propietarios</option>
              <option value="Arrendatario">Arrendatarios</option>
              <option value="Residente">Residentes</option>
            </select>
            <select
              aria-label="Filtrar por estado"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as 'ACTIVE' | 'INACTIVE' | 'ALL');
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
              <option value="ALL">Todos los estados</option>
            </select>
          </div>
        </div>
        
        {/* Mobile Cards List (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {paginatedResidents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No se encontraron residentes con los filtros aplicados.
            </div>
          ) : (
            paginatedResidents.map((res) => (
              <div key={res.id} className="p-4 space-y-3 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[var(--tenant-primary)] flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      {res.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{res.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Home className="w-3 h-3 text-slate-500" />
                          {unitLabel({ number: res.propertyNumber, name: res.propertyName })}
                        </span>
                        <Badge variant={res.type === 'Propietario' ? 'secondary' : 'outline'}>
                          {res.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                    res.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${res.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {statusLabel(res.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1.5 pt-1 text-xs text-slate-600 border-t border-slate-50">
                  <a href={`tel:${res.phone}`} className="flex items-center gap-2 py-1 text-slate-700 hover:text-blue-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{res.phone}</span>
                  </a>
                  <a href={`mailto:${res.email}`} className="flex items-center gap-2 py-1 text-slate-700 hover:text-blue-600 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{res.email}</span>
                  </a>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button 
                    onClick={() => handleOpenEdit(res)}
                    className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(res.id, res.name)}
                    className="min-h-[40px] px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50/50 hover:bg-rose-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
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
                <th className="px-6 py-3.5 font-semibold">Residente</th>
                <th className="px-6 py-3.5 font-semibold">Propiedad</th>
                <th className="px-6 py-3.5 font-semibold">Tipo</th>
                <th className="px-6 py-3.5 font-semibold">Contacto</th>
                <th className="px-6 py-3.5 font-semibold">Estado</th>
                <th className="px-6 py-3.5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedResidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No se encontraron residentes con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedResidents.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[var(--tenant-primary)] flex items-center justify-center font-bold text-xs shadow-xs">
                          {res.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{res.name}</div>
                          {res.documentId && <div className="text-xs text-slate-400">Doc. {res.documentId}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-800">
                        <Home className="w-3 h-3 text-slate-500" />
                        {unitLabel({ number: res.propertyNumber, name: res.propertyName })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={res.type === 'Propietario' ? 'secondary' : 'outline'}>
                        {res.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs text-slate-600 gap-0.5">
                        <span className="flex items-center gap-1 font-medium text-slate-800">
                          <Phone className="w-3 h-3 text-slate-400" /> {res.phone}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" /> {res.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        res.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${res.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {statusLabel(res.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => handleOpenEdit(res)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar residente"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(res.id, res.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar residente"
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
        {totalElements > 0 && paginatedResidents.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Mostrando {firstShown} a {lastShown} de {totalElements} residentes
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                aria-label="Página anterior"
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
                aria-label="Página siguiente"
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

      {/* Modal Crear / Editar Residente */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isSubmitting) setIsModalOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="resident-modal-title"
            className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 id="resident-modal-title" className="text-lg font-bold text-slate-900">
                {editingResident ? 'Editar Residente' : 'Registrar Nuevo Residente'}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    id="name"
                    label="Nombre completo"
                    required
                    error={errors.name}
                    maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                    currentLength={formData.name.length}
                  >
                    <input
                      type="text"
                      id="name"
                      name="name"
                      maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                      autoComplete="name"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: '' });
                      }}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="Ej. Juan Pérez"
                    />
                  </FormField>

                  <FormField
                    id="email"
                    label="Correo electrónico"
                    required
                    error={errors.email}
                  >
                    <input
                      type="email"
                      id="email"
                      name="email"
                      maxLength={FIELD_LIMITS.EMAIL_MAX_LENGTH}
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: sanitizeEmailInput(e.target.value) });
                        if (errors.email) setErrors({ ...errors, email: '' });
                      }}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="juan@ejemplo.com"
                    />
                  </FormField>

                  <FormField
                    id="phone"
                    label="Teléfono"
                    required
                    error={errors.phone}
                  >
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      maxLength={FIELD_LIMITS.PHONE_MAX_LENGTH}
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: formatPhoneInput(e.target.value) });
                        if (errors.phone) setErrors({ ...errors, phone: '' });
                      }}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="300 123 4567"
                    />
                  </FormField>
                </div>
<div className="grid grid-cols-1 gap-3 col-span-2">
                <FormField
                  id="propertyId"
                  label="Unidad"
                  required
                  error={errors.propertyId}
                  helperText="Una unidad por registro. Para varias unidades usa «Asignar existente» o la invitación."
                >
                  <select
                    id="propertyId"
                    name="propertyId"
                    value={formData.propertyId}
                    onChange={(e) => {
                      setFormData({ ...formData, propertyId: e.target.value });
                      if (errors.propertyId) setErrors({ ...errors, propertyId: '' });
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Selecciona una unidad</option>
                    {unitOptions.map((p) => (
                      <option key={p.id} value={p.id}>{unitLabel(p)}</option>
                    ))}
                  </select>
                </FormField>
                <input
                  type="search"
                  aria-label="Buscar unidad"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Filtrar unidades por torre, piso o apartamento"
                />

                <FormField
                    id="type"
                  label="Tipo de residente"
                  required
                >
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Propietario">Propietario</option>
                    <option value="Arrendatario">Arrendatario</option>
                  </select>
                </FormField>
              </div>

              {editingResident && (
                <FormField
                  id="status"
                  label="Estado de cuenta"
                  helperText={formData.status === 'INACTIVE' ? 'Inactivo equivale a dar de baja de esta unidad; el historial se conserva.' : undefined}
                >
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
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
                  {editingResident ? 'Guardar Cambios' : 'Registrar Residente'}
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

