import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Search, Plus, Filter, Package as PackageIcon, CheckCircle2, Edit, Trash2, X, Clock, ChevronLeft, ChevronRight, Boxes, CheckCheck } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useTenant } from '../../contexts/TenantContext';
import type { Package } from '../../types';
import { packageSchema } from '../../validation/schemas/packageSchema';
import { validateForm } from '../../validation/validators/formValidator';
import { FormField } from '../../components/ui/FormField';
import { FormErrorSummary } from '../../components/ui/FormErrorSummary';
import { CharacterCounter } from '../../components/ui/CharacterCounter';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { notificationService } from '../../services/notificationService';
import { normalizeWhitespace } from '../../utils/sanitizers';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import { getStatusLabel } from '../../utils/statusLabels';

const ITEMS_PER_PAGE = 8;

export const AdminPackages = () => {
  const { currentTenant } = useTenant();
  const { packages, createPackage, createBatchPackages, updatePackage, deletePackage, markPackageDelivered, deliverAllUnitPackages, properties, residents } = useData();

  const tenantId = currentTenant?.id || 'tenant-limonar';
  const tenantPackages = useMemo(() => {
    return packages.filter((p) => p.tenantId === tenantId);
  }, [packages, tenantId]);

  const tenantProperties = useMemo(() => {
    return properties.filter((p) => p.tenantId === tenantId);
  }, [properties, tenantId]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [formData, setFormData] = useState({
    propertyId: tenantProperties[0]?.name || 'Torre 1 - 101',
    recipientName: '',
    company: 'Mercado Libre',
    trackingNumber: '',
    status: 'RECEIVED' as Package['status'],
    observations: ''
  });

  // Batch reception
  const [batchCompany, setBatchCompany] = useState('Mercado Libre');
  const [batchItems, setBatchItems] = useState<Array<{ propertyId: string; recipientName: string; trackingNumber: string; observations: string }>>([
    { propertyId: tenantProperties[0]?.name || 'Torre 1 - 101', recipientName: '', trackingNumber: `ML-${Date.now().toString().slice(-4)}-1`, observations: '' },
    { propertyId: tenantProperties[1]?.name || 'Torre 1 - 102', recipientName: '', trackingNumber: `ML-${Date.now().toString().slice(-4)}-2`, observations: '' },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ field: string; message: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getPropertyPath = (idOrName: string) => {
    if (!idOrName) return '';
    const property = properties.find(p => p.id === idOrName);
    return property ? (property.path || property.name || idOrName) : idOrName;
  };

  const filteredPackages = tenantPackages.filter(p => {
    const matchesSearch = !searchTerm ||
      p.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPropertyPath(p.propertyId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.trackingNumber && p.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'Todos' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPackages.length / ITEMS_PER_PAGE) || 1;
  const paginatedPackages = filteredPackages.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleOpenCreate = () => {
    setEditingPackage(null);
    setFormData({
      propertyId: tenantProperties[0]?.id || '',
      recipientName: '',
      company: 'Mercado Libre',
      trackingNumber: `TRK-${Date.now().toString().slice(-6)}`,
      status: 'RECEIVED',
      observations: ''
    });
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormData({
      propertyId: pkg.propertyId,
      recipientName: pkg.recipientName,
      company: pkg.company,
      trackingNumber: pkg.trackingNumber || '',
      status: pkg.status,
      observations: pkg.observations || ''
    });
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalized = {
      recipientName: normalizeWhitespace(formData.recipientName),
      propertyId: formData.propertyId.trim(),
      company: formData.company.trim(),
      trackingNumber: formData.trackingNumber ? formData.trackingNumber.trim().toUpperCase() : '',
      observations: formData.observations ? normalizeWhitespace(formData.observations) : '',
    };

    const validation = validateForm(packageSchema, normalized);

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

      if (editingPackage) {
        updatePackage(editingPackage.id, {
          ...normalized,
          status: formData.status,
        });
        notificationService.showToast('Paquete actualizado correctamente', 'success');
      } else {
        createPackage({
          ...normalized,
          status: formData.status,
          tenantId: currentTenant?.id || 'tenant-limonar'
        });
        notificationService.showToast('Paquete registrado y asignado', 'success');
      }

      setIsModalOpen(false);
    } catch {
      notificationService.showError('Error al guardar', 'No fue posible guardar el paquete.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, recipient: string) => {
    const confirmed = await notificationService.showConfirm(
      '¿Eliminar registro?',
      `¿Deseas eliminar la encomienda para ${recipient}? Esta acción no se puede deshacer.`,
      'Sí, eliminar',
      'Cancelar'
    );

    if (confirmed) {
      deletePackage(id);
      notificationService.showToast('Paquete eliminado', 'success');
    }
  };

  const handleOpenBatch = () => {
    setBatchCompany('Mercado Libre');
    setBatchItems([
      { propertyId: properties[0]?.id || '', recipientName: '', trackingNumber: `ML-${Date.now().toString().slice(-4)}-1`, observations: '' },
      { propertyId: properties[1]?.id || '', recipientName: '', trackingNumber: `ML-${Date.now().toString().slice(-4)}-2`, observations: '' },
    ]);
    setIsBatchModalOpen(true);
  };

  const handleAddBatchRow = () => {
    setBatchItems(prev => [
      ...prev,
      { 
        propertyId: properties[0]?.id || '', 
        recipientName: '', 
        trackingNumber: `${batchCompany.slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-4)}-${prev.length + 1}`, 
        observations: '' 
      }
    ]);
  };

  const handleRemoveBatchRow = (index: number) => {
    if (batchItems.length <= 1) {
      notificationService.showToast('Debe haber al menos 1 paquete en el lote', 'info');
      return;
    }
    setBatchItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleBatchPropertyChange = (index: number, propName: string) => {
    const residentForProp = residents.find(r => r.propertyId === propName);
    setBatchItems(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          propertyId: propName,
          recipientName: residentForProp ? residentForProp.name : item.recipientName
        };
      }
      return item;
    }));
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = batchItems.filter(item => item.propertyId && (item.recipientName || item.trackingNumber));
    if (validRows.length === 0) {
      notificationService.showError('Formulario incompleto', 'Debes completar al menos un paquete con unidad y destinatario.');
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 400));
      const created = await createBatchPackages(validRows.map(row => ({
        recipientName: row.recipientName.trim() || `Residente ${row.propertyId}`,
        propertyId: row.propertyId,
        company: batchCompany,
        trackingNumber: row.trackingNumber.trim().toUpperCase(),
        observations: row.observations.trim() || undefined,
        status: 'RECEIVED',
        tenantId: currentTenant?.id || 'tenant-limonar'
      })));

      notificationService.showToast(`Lote registrado: ${created.length} paquetes ingresados con éxito`, 'success');
      setIsBatchModalOpen(false);
    } catch {
      notificationService.showError('Error al guardar', 'No fue posible registrar el lote de paquetería.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeliverAllForUnit = async (propertyId: string) => {
    const count = await deliverAllUnitPackages(propertyId);
    const path = getPropertyPath(propertyId);
    if (count > 0) {
      notificationService.showToast(`Se entregaron ${count} paquete(s) de la unidad ${path}`, 'success');
    } else {
      notificationService.showToast(`No hay paquetes pendientes para ${path}`, 'info');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Gestión de Paquetería</h2>
          <p className="text-slate-500 text-sm">Control centralizado de encomiendas recibidas en portería y entregas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={handleOpenBatch} 
            variant="outline" 
            className="shrink-0 border-blue-200 text-blue-700 bg-blue-50/60 hover:bg-blue-100 rounded-xl"
          >
            <Boxes className="w-4 h-4 mr-2" /> Recepción en Lote
          </Button>
          <Button onClick={handleOpenCreate} className="shrink-0 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Registrar Encomienda
          </Button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-amber-600">{packages.filter(p => p.status !== 'DELIVERED').length}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">En custodia / Pendientes</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-emerald-600">{packages.filter(p => p.status === 'DELIVERED').length}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Entregados a residentes</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-slate-900">{packages.length}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Total encomiendas</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <PackageIcon className="w-5 h-5" />
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
              placeholder="Buscar por destinatario, apartamento, transportadora o guía..." 
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
              <option value="RECEIVED">Recibido en portería</option>
              <option value="NOTIFIED">Notificado</option>
              <option value="DELIVERED">Entregado</option>
            </select>
          </div>
        </div>
        
        {/* Mobile Cards List (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {paginatedPackages.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No se encontraron paquetes con los filtros aplicados.
            </div>
          ) : (
            paginatedPackages.map((pkg) => (
              <div key={pkg.id} className="p-4 space-y-3 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[var(--tenant-primary)] flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                      <PackageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm leading-snug">{pkg.recipientName}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {getPropertyPath(pkg.propertyId)}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">{pkg.company}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    pkg.status === 'DELIVERED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      pkg.status === 'DELIVERED' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    {getStatusLabel(pkg.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Guía</span>
                    <span className="font-mono text-slate-700">{pkg.trackingNumber || 'Sin guía'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Recibido</span>
                    <span className="text-slate-700">{pkg.receivedAt}</span>
                  </div>
                  {pkg.deliveredAt && (
                    <div className="col-span-2 text-emerald-700 font-medium">
                      Entregado: {pkg.deliveredAt}
                    </div>
                  )}
                  {pkg.observations && (
                    <div className="col-span-2 text-slate-600 italic">
                      "{pkg.observations}"
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {pkg.status !== 'DELIVERED' && (
                    <button
                      onClick={() => {
                        markPackageDelivered(pkg.id);
                        notificationService.showToast('Paquete marcado como entregado', 'success');
                      }}
                      className="flex-1 min-h-[40px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Entregar
                    </button>
                  )}
                  <button 
                    onClick={() => handleOpenEdit(pkg)}
                    className="min-h-[40px] px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(pkg.id, pkg.recipientName)}
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
                <th className="px-6 py-3.5 font-semibold">Destinatario</th>
                <th className="px-6 py-3.5 font-semibold">Propiedad</th>
                <th className="px-6 py-3.5 font-semibold">Empresa / Guía</th>
                <th className="px-6 py-3.5 font-semibold">Estado</th>
                <th className="px-6 py-3.5 font-semibold">Fechas</th>
                <th className="px-6 py-3.5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPackages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No se encontraron paquetes con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedPackages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[var(--tenant-primary)] flex items-center justify-center font-bold text-xs shadow-xs">
                          <PackageIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{pkg.recipientName}</div>
                          {pkg.observations && (
                            <div className="text-xs text-slate-400 max-w-xs truncate">{pkg.observations}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700">
                          {getPropertyPath(pkg.propertyId)}
                        </span>
                        {packages.filter(p => p.propertyId === pkg.propertyId && p.status !== 'DELIVERED').length > 1 && (
                          <button
                            onClick={() => handleDeliverAllForUnit(pkg.propertyId)}
                            title={`Entregar todos los paquetes pendientes de ${getPropertyPath(pkg.propertyId)}`}
                            className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCheck className="w-3 h-3 text-blue-600" />
                            Entregar todos ({packages.filter(p => p.propertyId === pkg.propertyId && p.status !== 'DELIVERED').length})
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-800">{pkg.company}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{pkg.trackingNumber || 'Sin guía'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        pkg.status === 'DELIVERED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          pkg.status === 'DELIVERED' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                        {getStatusLabel(pkg.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <div>Recibido: {pkg.receivedAt}</div>
                      {pkg.deliveredAt && <div className="text-emerald-600 font-medium">Entregado: {pkg.deliveredAt}</div>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {pkg.status !== 'DELIVERED' && (
                          <button
                            onClick={() => {
                              markPackageDelivered(pkg.id);
                              notificationService.showToast('Paquete marcado como entregado', 'success');
                            }}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="Marcar como entregado"
                          >
                            Entregar
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenEdit(pkg)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(pkg.id, pkg.recipientName)}
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
        {filteredPackages.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredPackages.length)} de {filteredPackages.length} paquetes
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

      {/* Modal Registrar / Editar Paquete */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isSubmitting) setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPackage ? 'Editar Paquete' : 'Registrar Paquete / Correspondencia'}
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
                id="admin-pkg-recipient"
                label="Nombre del destinatario"
                required
                error={errors.recipientName}
              >
                <input
                  id="admin-pkg-recipient"
                  name="recipientName"
                  type="text"
                  maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                  value={formData.recipientName}
                  onChange={(e) => {
                    setFormData({ ...formData, recipientName: e.target.value });
                    if (errors.recipientName) setErrors({ ...errors, recipientName: '' });
                  }}
                  placeholder="Ej. Sebastián Gómez"
                  aria-invalid={Boolean(errors.recipientName)}
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                    errors.recipientName ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                  }`}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="admin-pkg-property"
                  label="Unidad / Apartamento"
                  required
                  error={errors.propertyId}
                >
                  <select
                    id="admin-pkg-property"
                    name="propertyId"
                    value={formData.propertyId}
                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.path || p.name}</option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  id="admin-pkg-company"
                  label="Transportadora"
                  required
                  error={errors.company}
                >
                  <select
                    id="admin-pkg-company"
                    name="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Mercado Libre">Mercado Libre</option>
                    <option value="Amazon">Amazon</option>
                    <option value="Servientrega">Servientrega</option>
                    <option value="Coordinadora">Coordinadora</option>
                    <option value="Deprisa">Deprisa</option>
                    <option value="Inter Rapidísimo">Inter Rapidísimo</option>
                    <option value="FedEx">FedEx</option>
                    <option value="DHL">DHL</option>
                    <option value="Otro">Otro</option>
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="admin-pkg-tracking"
                  label="Número de guía"
                  error={errors.trackingNumber}
                >
                  <input
                    id="admin-pkg-tracking"
                    name="trackingNumber"
                    type="text"
                    maxLength={FIELD_LIMITS.TRACKING_NUMBER_MAX_LENGTH}
                    value={formData.trackingNumber}
                    onChange={(e) => {
                      setFormData({ ...formData, trackingNumber: e.target.value.toUpperCase() });
                      if (errors.trackingNumber) setErrors({ ...errors, trackingNumber: '' });
                    }}
                    placeholder="TRK-123456"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </FormField>

                <FormField
                  id="admin-pkg-status"
                  label="Estado"
                >
                  <select
                    id="admin-pkg-status"
                    name="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="RECEIVED">RECIBIDO</option>
                    <option value="NOTIFIED">NOTIFICADO</option>
                    <option value="DELIVERED">ENTREGADO</option>
                  </select>
                </FormField>
              </div>

              <FormField
                id="admin-pkg-obs"
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
                  id="admin-pkg-obs"
                  name="observations"
                  rows={2}
                  maxLength={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Observaciones de entrega..."
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
                  {editingPackage ? 'Guardar Cambios' : 'Registrar Encomienda'}
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Recepción Múltiple / Lote */}
      {isBatchModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isSubmitting) setIsBatchModalOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Recepción por Lote de Encomiendas</h3>
                  <p className="text-xs text-slate-500">Ingreso simultáneo de paquetes recibidos por un mismo transportador para agilizar la operación.</p>
                </div>
              </div>
              <button 
                onClick={() => !isSubmitting && setIsBatchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Transportadora / Proveedor
                </label>
                <select
                  value={batchCompany}
                  onChange={(e) => setBatchCompany(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Mercado Libre">Mercado Libre</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Servientrega">Servientrega</option>
                  <option value="Coordinadora">Coordinadora</option>
                  <option value="Deprisa">Deprisa</option>
                  <option value="Inter Rapidísimo">Inter Rapidísimo</option>
                  <option value="FedEx">FedEx</option>
                  <option value="DHL">DHL</option>
                  <option value="Otro">Otro / Mensajería Local</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Paquetes a registrar ({batchItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddBatchRow}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar otro paquete
                  </button>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {batchItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">
                          Paquete #{idx + 1}
                        </span>
                        {batchItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBatchRow(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                            title="Quitar de este lote"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Unidad / Apto</label>
                          <select
                            value={item.propertyId}
                            onChange={(e) => handleBatchPropertyChange(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {properties.map(p => (
                              <option key={p.id} value={p.id}>{p.path || p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Destinatario</label>
                          <input
                            type="text"
                            value={item.recipientName}
                            placeholder="Nombre del residente"
                            onChange={(e) => {
                              const val = e.target.value;
                              setBatchItems(prev => prev.map((it, i) => i === idx ? { ...it, recipientName: val } : it));
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Guía / Tracking (opcional)</label>
                          <input
                            type="text"
                            value={item.trackingNumber}
                            placeholder="TRK-12345"
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setBatchItems(prev => prev.map((it, i) => i === idx ? { ...it, trackingNumber: val } : it));
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsBatchModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <SubmitButton
                  isSubmitting={isSubmitting}
                  loadingText="Ingresando lote..."
                  className="rounded-xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white"
                >
                  Registrar {batchItems.length} Encomiendas
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


