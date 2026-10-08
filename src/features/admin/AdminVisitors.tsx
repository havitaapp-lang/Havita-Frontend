import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Search, Plus, Filter, ShieldCheck, LogIn, LogOut, Edit, Trash2, X, Car, ChevronLeft, ChevronRight, CheckCircle2, Settings } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useTenant } from '../../contexts/TenantContext';
import type { Visitor } from '../../types';
import { visitorSchema } from '../../validation/schemas/visitorSchema';
import { validateForm } from '../../validation/validators/formValidator';
import { FormField } from '../../components/ui/FormField';
import { FormErrorSummary } from '../../components/ui/FormErrorSummary';
import { CharacterCounter } from '../../components/ui/CharacterCounter';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { notificationService } from '../../services/notificationService';
import { VisitorScheduleSettings } from './components/VisitorScheduleSettings';
import { maskDocument, normalizeWhitespace } from '../../utils/sanitizers';
import { FIELD_LIMITS } from '../../validation/rules/limits';

const ITEMS_PER_PAGE = 8;

export const AdminVisitors = () => {
  const { currentTenant } = useTenant();
  const { visitors, createVisitor, updateVisitor, deleteVisitor, recordVisitorEntry, recordVisitorExit, properties } = useData();

  const tenantId = currentTenant?.id || 'tenant-limonar';
  const tenantVisitors = useMemo(() => {
    return visitors.filter((v) => v.tenantId === tenantId);
  }, [visitors, tenantId]);

  const tenantProperties = useMemo(() => {
    return properties.filter((p) => p.tenantId === tenantId);
  }, [properties, tenantId]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    documentId: '',
    propertyId: tenantProperties[0]?.name || 'Torre 1 - 101',
    status: 'APPROVED' as Visitor['status'],
    expectedAt: 'Hoy, 02:00 PM',
    vehiclePlate: '',
    observations: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ field: string; message: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredVisitors = tenantVisitors.filter(v => {
    const matchesSearch = !searchTerm ||
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.documentId.includes(searchTerm) ||
      v.propertyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.vehiclePlate && v.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'Todos' || v.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredVisitors.length / ITEMS_PER_PAGE) || 1;
  const paginatedVisitors = filteredVisitors.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleOpenCreate = () => {
    setEditingVisitor(null);
    setFormData({
      name: '',
      documentId: '',
      propertyId: tenantProperties[0]?.name || 'Torre 1 - 101',
      status: 'APPROVED',
      expectedAt: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      vehiclePlate: '',
      observations: ''
    });
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vis: Visitor) => {
    setEditingVisitor(vis);
    setFormData({
      name: vis.name,
      documentId: vis.documentId,
      propertyId: vis.propertyId,
      status: vis.status,
      expectedAt: vis.expectedAt || '',
      vehiclePlate: vis.vehiclePlate || '',
      observations: vis.observations || ''
    });
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalized = {
      name: normalizeWhitespace(formData.name),
      documentId: formData.documentId.trim(),
      propertyId: formData.propertyId.trim(),
      vehiclePlate: formData.vehiclePlate ? formData.vehiclePlate.trim().toUpperCase() : '',
      observations: formData.observations ? normalizeWhitespace(formData.observations) : '',
    };

    const validation = validateForm(visitorSchema, normalized);

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

      if (editingVisitor) {
        updateVisitor(editingVisitor.id, {
          ...normalized,
          status: formData.status,
          expectedAt: formData.expectedAt,
        });
        notificationService.showToast('Visita actualizada correctamente', 'success');
      } else {
        createVisitor({
          ...normalized,
          status: formData.status,
          expectedAt: formData.expectedAt,
          tenantId: currentTenant?.id || 'tenant-limonar'
        });
        notificationService.showToast('Visita registrada exitosamente', 'success');
      }

      setIsModalOpen(false);
    } catch {
      notificationService.showError('Error al guardar', 'No fue posible registrar la visita.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await notificationService.showConfirm(
      '¿Eliminar registro de visita?',
      `¿Deseas eliminar la visita de "${name}"? Esta acción no se puede deshacer.`,
      'Sí, eliminar',
      'Cancelar'
    );

    if (confirmed) {
      deleteVisitor(id);
      notificationService.showToast('Registro de visita eliminado', 'success');
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'Hoy';
    if (!dateString.includes('T')) return dateString;
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Control de Visitas & Accesos</h2>
          <p className="text-slate-500 text-sm">Monitorea autorizaciones, ingresos vehiculares y peatonales en tiempo real.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsSettingsOpen(true)} variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
            <Settings className="w-4 h-4 mr-2" /> Horarios
          </Button>
          <Button onClick={handleOpenCreate} className="shrink-0 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Registrar Visita
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-blue-600">{visitors.filter(v => v.status === 'APPROVED').length}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Esperados / Autorizados</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-emerald-600">{visitors.filter(v => v.status === 'ENTERED').length}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Actualmente en la unidad</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <LogIn className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-slate-700">{visitors.filter(v => v.status === 'EXITED').length}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Salidas registradas hoy</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <LogOut className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Modal Settings de Horarios de Visitas */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200 shadow-2xl rounded-2xl">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <VisitorScheduleSettings />
          </div>
        </div>
      )}

      {/* Table Card */}
      <Card className="overflow-hidden border border-slate-200/80 rounded-2xl shadow-sm bg-white">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 bg-slate-50/70">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="search"
              maxLength={FIELD_LIMITS.SEARCH_MAX_LENGTH}
              placeholder="Buscar por nombre, documento, apartamento o placa..." 
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[var(--tenant-primary)]"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="Todos">Todos los estados</option>
              <option value="APPROVED">Autorizado</option>
              <option value="ENTERED">Adentro</option>
              <option value="EXITED">Salió</option>
            </select>
          </div>
        </div>
        
        {/* Mobile Cards List (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {paginatedVisitors.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No se encontraron visitantes con los filtros aplicados.
            </div>
          ) : (
            paginatedVisitors.map((vis) => (
              <div key={vis.id} className="p-4 space-y-3 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{vis.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {vis.propertyId}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Doc: {}
                      </span>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    vis.status === 'ENTERED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    vis.status === 'APPROVED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    vis.status === 'EXITED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                    vis.status === 'EXPIRED' ? 'bg-slate-50 text-slate-500 border border-slate-200' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      vis.status === 'ENTERED' ? 'bg-emerald-500' :
                      vis.status === 'APPROVED' ? 'bg-blue-500' : 
                      vis.status === 'EXITED' ? 'bg-rose-500' :
                      vis.status === 'EXPIRED' ? 'bg-slate-400' :
                      'bg-slate-400'
                    }`} />
                    {vis.status === 'ENTERED' ? 'Adentro' : vis.status === 'APPROVED' ? 'Esperado' : vis.status === 'EXITED' ? 'Salió' : vis.status === 'EXPIRED' ? 'Expirado' : vis.status === 'PENDING' ? 'Pendiente' : vis.status === 'CANCELLED' ? 'Cancelado' : vis.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Acceso / Vehículo</span>
                    {vis.vehiclePlate ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-0.5 rounded-md bg-amber-50 text-amber-900 font-mono text-[11px] font-bold border border-amber-200">
                        <Car className="w-3 h-3" />
                        {vis.vehiclePlate}
                      </span>
                    ) : (
                      <span className="text-slate-600 font-medium">Peatonal</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Horario</span>
                    <span className="text-slate-700 font-medium">
                      {vis.status === 'ENTERED' && `Entró: ${formatTime(vis.enteredAt)}`}
                      {vis.status === 'EXITED' && `Salió: ${formatTime(vis.exitedAt)}`}
                      {vis.status === 'APPROVED' && `Esperado: ${formatTime(vis.expectedAt)}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {vis.status === 'APPROVED' && (
                    <button
                      onClick={() => recordVisitorEntry(vis.id)}
                      className="flex-1 min-h-[40px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Dar Ingreso
                    </button>
                  )}
                  {vis.status === 'ENTERED' && (
                    <button
                      onClick={() => recordVisitorExit(vis.id)}
                      className="flex-1 min-h-[40px] px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <LogOut className="w-4 h-4" />
                      Registrar Salida
                    </button>
                  )}
                  <button 
                    onClick={() => handleOpenEdit(vis)}
                    className="min-h-[40px] px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(vis.id, vis.name)}
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
                <th className="px-6 py-3.5 font-semibold">Visitante</th>
                <th className="px-6 py-3.5 font-semibold">Destino</th>
                <th className="px-6 py-3.5 font-semibold">Vehículo</th>
                <th className="px-6 py-3.5 font-semibold">Estado</th>
                <th className="px-6 py-3.5 font-semibold">Horario / Registro</th>
                <th className="px-6 py-3.5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedVisitors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No se encontraron visitantes con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedVisitors.map((vis) => (
                  <tr key={vis.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-slate-900">{vis.name}</div>
                        <div className="text-xs text-slate-400 font-mono">
                          Doc: {}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs">
                        {vis.propertyId}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {vis.vehiclePlate ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-mono text-xs font-bold border border-amber-200">
                          <Car className="w-3.5 h-3.5" />
                          {vis.vehiclePlate}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Peatonal</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        vis.status === 'ENTERED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        vis.status === 'APPROVED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        vis.status === 'EXITED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        vis.status === 'EXPIRED' ? 'bg-slate-50 text-slate-500 border border-slate-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          vis.status === 'ENTERED' ? 'bg-emerald-500' :
                          vis.status === 'APPROVED' ? 'bg-blue-500' : 
                          vis.status === 'EXITED' ? 'bg-rose-500' :
                          vis.status === 'EXPIRED' ? 'bg-slate-400' :
                          'bg-slate-400'
                        }`} />
                        {vis.status === 'ENTERED' ? 'Adentro' : vis.status === 'APPROVED' ? 'Esperado' : vis.status === 'EXITED' ? 'Salió' : vis.status === 'EXPIRED' ? 'Expirado' : vis.status === 'PENDING' ? 'Pendiente' : vis.status === 'CANCELLED' ? 'Cancelado' : vis.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {vis.status === 'ENTERED' && <div>Entró: {formatTime(vis.enteredAt)}</div>}
                      {vis.status === 'EXITED' && <div>Salió: {formatTime(vis.exitedAt)}</div>}
                      {vis.status === 'APPROVED' && <div>Esperado: {formatTime(vis.expectedAt)}</div>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {vis.status === 'APPROVED' && (
                          <button
                            onClick={() => recordVisitorEntry(vis.id)}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="Marcar ingreso"
                          >
                            Dar Ingreso
                          </button>
                        )}
                        {vis.status === 'ENTERED' && (
                          <button
                            onClick={() => recordVisitorExit(vis.id)}
                            className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="Marcar salida"
                          >
                            Registrar Salida
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenEdit(vis)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(vis.id, vis.name)}
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
        {filteredVisitors.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredVisitors.length)} de {filteredVisitors.length} visitantes
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

      {/* Modal Registrar / Editar Visitante */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isSubmitting) setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingVisitor ? 'Editar Visitante' : 'Registrar Visita'}
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
                id="admin-vis-name"
                label="Nombre del visitante"
                required
                error={errors.name}
              >
                <input
                  id="admin-vis-name"
                  name="name"
                  type="text"
                  maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: '' });
                  }}
                  placeholder="Ej. Andrés Restrepo"
                  aria-invalid={Boolean(errors.name)}
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                    errors.name ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                  }`}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="admin-vis-doc"
                  label="Documento"
                  required
                  error={errors.documentId}
                >
                  <input
                    id="admin-vis-doc"
                    name="documentId"
                    type="text"
                    maxLength={FIELD_LIMITS.DOCUMENT_MAX_LENGTH}
                    value={formData.documentId}
                    onChange={(e) => {
                      setFormData({ ...formData, documentId: e.target.value });
                      if (errors.documentId) setErrors({ ...errors, documentId: '' });
                    }}
                    placeholder="C.C. 10203040"
                    aria-invalid={Boolean(errors.documentId)}
                    className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                      errors.documentId ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                    }`}
                  />
                </FormField>

                <FormField
                  id="admin-vis-plate"
                  label="Placa vehicular"
                  error={errors.vehiclePlate}
                >
                  <input
                    id="admin-vis-plate"
                    name="vehiclePlate"
                    type="text"
                    maxLength={FIELD_LIMITS.VEHICLE_PLATE_MAX_LENGTH}
                    value={formData.vehiclePlate}
                    onChange={(e) => {
                      setFormData({ ...formData, vehiclePlate: e.target.value.toUpperCase() });
                      if (errors.vehiclePlate) setErrors({ ...errors, vehiclePlate: '' });
                    }}
                    placeholder="ABC 123"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="admin-vis-property"
                  label="Propiedad de destino"
                  required
                  error={errors.propertyId}
                >
                  <select
                    id="admin-vis-property"
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
                  id="admin-vis-status"
                  label="Estado"
                >
                  <select
                    id="admin-vis-status"
                    name="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="APPROVED">Autorizado</option>
                    <option value="ENTERED">Adentro</option>
                    <option value="EXITED">Salió</option>
                  </select>
                </FormField>
              </div>

              <FormField
                id="admin-vis-obs"
                label="Observaciones"
                counter={
                  <CharacterCounter
                    current={formData.observations.length}
                    max={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH}
                    alwaysVisible
                  />
                }
              >
                <textarea
                  id="admin-vis-obs"
                  name="observations"
                  rows={2}
                  maxLength={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Observaciones de ingreso..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
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
                  loadingText="Guardando..."
                  className="rounded-xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white"
                >
                  {editingVisitor ? 'Guardar Cambios' : 'Registrar Visita'}
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
