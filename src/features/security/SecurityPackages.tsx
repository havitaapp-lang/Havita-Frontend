import { getStatusLabel } from '../../utils/statusLabels';
import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Search, Plus, Package as PackageIcon, CheckCircle2, Trash2, Edit, X, PackagePlus, ChevronLeft, ChevronRight, Boxes, CheckCheck } from 'lucide-react';
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
import { PropertySelectorModal } from './components/PropertySelectorModal';

const ITEMS_PER_PAGE = 5;

export const SecurityPackages = () => {
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
  const [filterTab, setFilterTab] = useState<'Pendientes' | 'Entregados' | 'Todos'>('Pendientes');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isPropertySelectorOpen, setIsPropertySelectorOpen] = useState(false);
  const [activePropertySelectorIndex, setActivePropertySelectorIndex] = useState<number | null>(null);

  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [formData, setFormData] = useState({
    recipientName: '',
    propertyId: '',
    company: 'Mercado Libre',
    trackingNumber: '',
    observations: ''
  });

  // Batch packages form state
  const [batchCompany, setBatchCompany] = useState('Mercado Libre');
  const [batchItems, setBatchItems] = useState<Array<{ propertyId: string; recipientName: string; trackingNumber: string; observations: string }>>([
    { propertyId: '', recipientName: '', trackingNumber: '', observations: '' },
    { propertyId: '', recipientName: '', trackingNumber: '', observations: '' },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ field: string; message: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPackages = tenantPackages.filter(p => {
    const matchesSearch = !searchTerm ||
      p.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.propertyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.trackingNumber && p.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTab = 
      filterTab === 'Todos' ? true :
      filterTab === 'Pendientes' ? p.status !== 'DELIVERED' :
      p.status === 'DELIVERED';

    return matchesSearch && matchesTab;
  });

  const totalPages = Math.ceil(filteredPackages.length / ITEMS_PER_PAGE) || 1;
  const paginatedPackages = filteredPackages.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleOpenCreate = () => {
    setEditingPackage(null);
    setFormData({
      recipientName: '',
      propertyId: '',
      company: 'Mercado Libre',
      trackingNumber: '',
      observations: ''
    });
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormData({
      recipientName: pkg.recipientName,
      propertyId: pkg.propertyId,
      company: pkg.company,
      trackingNumber: pkg.trackingNumber || '',
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
        updatePackage(editingPackage.id, normalized);
        notificationService.showToast('Paquete actualizado correctamente', 'success');
      } else {
        await createPackage({
          ...normalized,
          status: 'RECEIVED',
          tenantId: currentTenant?.id || 'tenant-limonar'
        });
        notificationService.showToast('Paquete registrado y residente notificado', 'success');
      }

      setIsModalOpen(false);
    } catch {
      notificationService.showError('Error al guardar', 'No fue posible registrar el paquete.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, recipient: string) => {
    const confirmed = await notificationService.showConfirm(
      '¿Eliminar paquete?',
      `¿Deseas eliminar el registro para ${recipient}? Esta acción no se puede deshacer.`,
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
      { propertyId: '', recipientName: '', trackingNumber: '', observations: '' },
      { propertyId: '', recipientName: '', trackingNumber: '', observations: '' },
    ]);
    setIsBatchModalOpen(true);
  };

  const handleAddBatchRow = () => {
    setBatchItems(prev => [
      ...prev,
      { 
        propertyId: '', 
        recipientName: '', 
        trackingNumber: '', 
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

  // handleBatchPropertyChange was removed because it's now handled by the modal onSelect
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = batchItems.filter(item => item.propertyId && (item.recipientName || item.trackingNumber));
    if (validRows.length === 0) {
      notificationService.showError('Formulario incompleto', 'Debes completar al menos un paquete válido con unidad y destinatario.');
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
    if (count > 0) {
      notificationService.showToast(`Se entregaron ${count} paquete(s) de la unidad ${propertyId}`, 'success');
    } else {
      notificationService.showToast(`No hay paquetes pendientes para ${propertyId}`, 'info');
    }
  };

  const getPropertyDisplay = (propId: string) => {
    if (!propId) return 'Seleccionar unidad';
    const prop = properties.find(p => p.id === propId);
    if (!prop) return propId; // fallback
    
    // Si la ruta o el nombre ya trae el formato completo, usémoslo para evitar duplicados.
    // Ejemplo: si el backend devuelve un path como "Torre 1 - Piso 2 - Apto 1"
    if (prop.path && prop.path.includes('-')) {
      return prop.path;
    }
    if (prop.name.includes('-') || prop.name.includes('Torre')) {
      return prop.name;
    }

    let struct = prop.structureName || '';
    if (struct && prop.structureType && !struct.toLowerCase().includes(prop.structureType.toLowerCase())) {
      struct = `${prop.structureType} ${struct}`;
    }

    let lvl = prop.level ? String(prop.level) : '';
    if (lvl && !lvl.toLowerCase().includes('piso')) {
      lvl = `Piso ${lvl}`;
    }

    let num = prop.number || prop.name || '';
    // Si el 'num' resulta ser toda la cadena "Torre 1-Piso 2-Apto 1", no lo concatenamos de nuevo
    if (num.includes(struct) && struct !== '') {
      return num; // ya viene armado desde el backend
    }
    
    return [struct, lvl, num].filter(Boolean).join('-');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Recepción de Paquetería</h2>
          <p className="text-slate-500 text-sm">Gestiona la correspondencia y entregas a residentes en portería de forma ágil.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={handleOpenBatch} 
            variant="outline" 
            className="shrink-0 border-blue-200 text-blue-700 bg-blue-50/60 hover:bg-blue-100 rounded-xl"
          >
            <Boxes className="w-4 h-4 mr-2" /> Recepción en Lote / Múltiple
          </Button>
          <Button onClick={handleOpenCreate} className="shrink-0 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl shadow-sm">
            <PackagePlus className="w-4 h-4 mr-2" /> Recibir Paquete
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit">
        {(['Pendientes', 'Entregados', 'Todos'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setFilterTab(tab); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterTab === tab
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden border border-slate-200/80 rounded-2xl shadow-sm bg-white">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              maxLength={FIELD_LIMITS.SEARCH_MAX_LENGTH}
              placeholder="Buscar por destinatario, apartamento, transportadora o número de guía..."
              className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[var(--tenant-primary)]"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Mobile Cards List (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {paginatedPackages.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No se encontraron paquetes registrados con los filtros actuales.
            </div>
          ) : (
            paginatedPackages.map((pkg) => (
              <div key={pkg.id} className="p-4 space-y-3 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                      <PackageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm leading-snug">{pkg.recipientName}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {getPropertyDisplay(pkg.propertyId)}
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
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Recepción</span>
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
                        notificationService.showToast('Paquete entregado al residente', 'success');
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
                <th className="px-6 py-3.5 font-semibold">Unidad</th>
                <th className="px-6 py-3.5 font-semibold">Empresa / Guía</th>
                <th className="px-6 py-3.5 font-semibold">Estado</th>
                <th className="px-6 py-3.5 font-semibold">Recepción</th>
                <th className="px-6 py-3.5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPackages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No se encontraron paquetes registrados con los filtros actuales.
                  </td>
                </tr>
              ) : (
                paginatedPackages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                          <PackageIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{pkg.recipientName}</div>
                          {pkg.observations && (
                            <div className="text-xs text-slate-400 truncate max-w-xs">{pkg.observations}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700">
                          {getPropertyDisplay(pkg.propertyId)}
                        </span>

                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{pkg.company}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{pkg.trackingNumber || 'Sin guía'}</div>
                      </div>
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
                              notificationService.showToast('Paquete entregado al residente', 'success');
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Entregar
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenEdit(pkg)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar paquete"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(pkg.id, pkg.recipientName)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar registro"
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

      {/* Modal Recibir / Editar Paquete */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isSubmitting) setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <PackageIcon className="w-5 h-5 text-blue-600" />
                {editingPackage ? 'Editar Paquete' : 'Recepción de Encomienda'}
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
                id="sec-pkg-recipient"
                label="Nombre del destinatario"
                required
                error={errors.recipientName}
              >
                <input
                  id="sec-pkg-recipient"
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
                  id="sec-pkg-property"
                  label="Unidad / Apartamento"
                  required
                  error={errors.propertyId}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActivePropertySelectorIndex(-1); // -1 para single
                      setIsPropertySelectorOpen(true);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs sm:text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all flex items-center justify-between ${
                      errors.propertyId ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                    } ${!formData.propertyId ? 'text-slate-400' : 'text-slate-900'}`}
                  >
                    <span className="truncate">{getPropertyDisplay(formData.propertyId)}</span>
                    <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
                  </button>
                </FormField>

                <FormField
                  id="sec-pkg-company"
                  label="Transportadora"
                  required
                  error={errors.company}
                >
                  <select
                    id="sec-pkg-company"
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

              <FormField
                id="sec-pkg-tracking"
                label="Número de guía / Tracking"
                error={errors.trackingNumber}
              >
                <input
                  id="sec-pkg-tracking"
                  name="trackingNumber"
                  type="text"
                  maxLength={FIELD_LIMITS.TRACKING_NUMBER_MAX_LENGTH}
                  value={formData.trackingNumber}
                  onChange={(e) => {
                    setFormData({ ...formData, trackingNumber: e.target.value.toUpperCase() });
                    if (errors.trackingNumber) setErrors({ ...errors, trackingNumber: '' });
                  }}
                  placeholder="TRK-987654"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </FormField>

              <FormField
                id="sec-pkg-obs"
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
                  id="sec-pkg-obs"
                  name="observations"
                  rows={2}
                  maxLength={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Caja mediana, sobre manila, paquete frágil..."
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
                  loadingText="Registrando..."
                  className="rounded-xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white"
                >
                  {editingPackage ? 'Guardar Cambios' : 'Registrar Paquete'}
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
                  <p className="text-xs text-slate-500">Registra de una sola vez la llegada de una camioneta o mensajero con paquetes de varias unidades.</p>
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
              {/* Transportadora común */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Transportadora / Empresa de Envíos (Común para todo el lote)
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

              {/* Lista dinámica de paquetes */}
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

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Unidad / Apto *</label>
                          <button
                            type="button"
                            onClick={() => {
                              setActivePropertySelectorIndex(idx);
                              setIsPropertySelectorOpen(true);
                            }}
                            className={`w-full px-2.5 py-1.5 text-xs text-left rounded-xl border bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 flex items-center justify-between ${!item.propertyId ? 'text-slate-400 border-rose-300' : 'text-slate-800 border-slate-200'}`}
                          >
                            <span className="truncate">{item.propertyId ? getPropertyDisplay(item.propertyId) : 'Seleccionar...'}</span>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          </button>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Destinatario *</label>
                          <input
                            type="text"
                            value={item.recipientName}
                            placeholder="Nombre del residente"
                            onChange={(e) => {
                              const val = e.target.value;
                              setBatchItems(prev => prev.map((it, i) => i === idx ? { ...it, recipientName: val } : it));
                            }}
                            className={`w-full px-2.5 py-1.5 text-xs rounded-xl border bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 ${!item.recipientName ? 'border-rose-300' : 'border-slate-200'}`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Guía / Tracking</label>
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

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Observaciones</label>
                          <input
                            type="text"
                            value={item.observations}
                            placeholder="Caja pequeña, sobre..."
                            onChange={(e) => {
                              const val = e.target.value;
                              setBatchItems(prev => prev.map((it, i) => i === idx ? { ...it, observations: val } : it));
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

      {/* Selector de Unidades */}
      <PropertySelectorModal
        isOpen={isPropertySelectorOpen}
        onClose={() => setIsPropertySelectorOpen(false)}
        properties={tenantProperties}
        onSelect={(prop) => {
          if (activePropertySelectorIndex === -1) {
            setFormData({ ...formData, propertyId: prop.id });
            // Pre-fill recipient with resident name if available
            const resForProp = residents.find(r => r.propertyId === prop.id);
            if (resForProp && !formData.recipientName) {
              setFormData(prev => ({ ...prev, propertyId: prop.id, recipientName: resForProp.name }));
            }
          } else if (activePropertySelectorIndex !== null) {
            setBatchItems(prev => prev.map((item, i) => {
              if (i === activePropertySelectorIndex) {
                const resForProp = residents.find(r => r.propertyId === prop.id);
                return { ...item, propertyId: prop.id, recipientName: item.recipientName || (resForProp ? resForProp.name : '') };
              }
              return item;
            }));
          }
        }}
      />
    </div>
  );
};


