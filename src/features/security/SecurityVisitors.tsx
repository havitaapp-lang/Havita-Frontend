import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Search, UserPlus, LogIn, LogOut, Edit, Trash2, X, Car, ShieldCheck, ChevronLeft, ChevronRight, QrCode, CheckCircle2, Check } from 'lucide-react';
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
import { maskDocument, normalizeWhitespace } from '../../utils/sanitizers';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import { PropertySelectorModal } from './components/PropertySelectorModal';
import { Building2 } from 'lucide-react';
import { QRScanner } from './components/QRScanner';

const ITEMS_PER_PAGE = 5;

export const SecurityVisitors = () => {
  const { currentTenant } = useTenant();
  const { visitors, createVisitor, updateVisitor, deleteVisitor, recordVisitorEntry, recordGroupEntry, recordVisitorExit, properties } = useData();

  const tenantId = currentTenant?.id || 'tenant-limonar';
  const tenantVisitors = useMemo(() => {
    return visitors.filter((v) => v.tenantId === tenantId);
  }, [visitors, tenantId]);

  const tenantProperties = useMemo(() => {
    return properties.filter((p) => p.tenantId === tenantId);
  }, [properties, tenantId]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'Todos' | 'APPROVED' | 'ENTERED' | 'EXITED'>('APPROVED');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPropSelectorOpen, setIsPropSelectorOpen] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    documentId: '',
    propertyId: tenantProperties[0]?.name || 'Torre 1 - 101',
    status: 'ENTERED' as Visitor['status'],
    expectedAt: 'Hoy',
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
    const matchesTab = filterTab === 'Todos' || v.status === filterTab;
    return matchesSearch && matchesTab;
  }).sort((a, b) => {
    const statusOrder: Record<string, number> = {
      'APPROVED': 1,
      'PENDING': 1,
      'ENTERED': 2,
      'EXITED': 3,
      'EXPIRED': 4,
    };
    const orderA = statusOrder[a.status] || 99;
    const orderB = statusOrder[b.status] || 99;
    
    if (orderA !== orderB) return orderA - orderB;
    
    const getSortDate = (v: Visitor) => {
      const time = new Date(v.createdAt || 0).getTime();
      return isNaN(time) ? 0 : time;
    };

    return getSortDate(b) - getSortDate(a);
  });

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
      propertyId: '',
      status: 'ENTERED',
      expectedAt: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      vehiclePlate: '',
      observations: 'Registro directo en portería'
    });
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vis: Visitor) => {
    setEditingVisitor(vis);
    const prop = tenantProperties.find(p => p.name === vis.propertyId || p.path === vis.propertyId || p.id === vis.propertyId);
    setFormData({
      name: vis.name,
      documentId: vis.documentId,
      propertyId: prop ? (prop.path || prop.name) : vis.propertyId,
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
        notificationService.showToast('Visitante actualizado correctamente', 'success');
      } else {
        createVisitor({
          ...normalized,
          status: formData.status,
          expectedAt: formData.expectedAt,
          tenantId: currentTenant?.id || 'tenant-limonar'
        });
        notificationService.showToast('Visitante registrado con éxito', 'success');
      }

      setIsModalOpen(false);
    } catch {
      notificationService.showError('Error al guardar', 'No fue posible registrar al visitante.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await notificationService.showConfirm(
      '¿Eliminar registro?',
      `¿Deseas eliminar el registro de ${name}? Esta acción no se puede deshacer.`,
      'Sí, eliminar',
      'Cancelar'
    );

    if (confirmed) {
      deleteVisitor(id);
      notificationService.showToast('Registro eliminado', 'success');
    }
  };

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedGroup, setScannedGroup] = useState<Visitor[] | null>(null);
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [scanError, setScanError] = useState(false);

  const handleOpenScanner = () => {
    setScannedGroup(null);
    setQrCodeInput('');
    setScanError(false);
    setIsScannerOpen(true);
  };

  const handleSearchQR = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!qrCodeInput.trim()) return;

    // Search by code or exact ID
    const exactMatch = visitors.find(v => (v.qrCode === qrCodeInput.trim() || v.id === qrCodeInput.trim()) && v.status === 'APPROVED');
    const targetGroupKey = exactMatch ? exactMatch.groupId : null;
    
    let groupMembers: Visitor[] = [];
    if (targetGroupKey) {
      groupMembers = visitors.filter(v => v.groupId === targetGroupKey);
    } else if (exactMatch) {
      groupMembers = [exactMatch];
    }
    
    if (groupMembers.length > 0) {
      setScannedGroup(groupMembers);
      setScanError(false);
    } else {
      setScanError(true);
      setScannedGroup(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Control de Accesos y Visitantes</h2>
          <p className="text-slate-500 text-sm">Gestiona ingresos peatonales y vehiculares en portería.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleOpenScanner} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm text-xs font-bold h-10 px-4 flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" /> Validar Pase QR / Visita
          </Button>
          <Button onClick={handleOpenCreate} className="shrink-0 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl shadow-sm text-xs font-bold h-10 px-4">
            <UserPlus className="w-4 h-4 mr-1.5" /> Registrar Manual
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit">
        {([{ id: 'Todos', label: 'Todos' }, { id: 'APPROVED', label: 'Esperados' }, { id: 'ENTERED', label: 'Adentro' }, { id: 'EXITED', label: 'Finalizados' }] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => { setFilterTab(tab.id as any); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterTab === tab.id
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
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
              placeholder="Buscar por nombre, documento, apartamento o placa..."
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
                          {vis.propertyName || vis.propertyId}
                        </span>
                      <span className="text-xs text-slate-400 font-mono">
                          Doc: {vis.documentId}
                        </span>
                        {vis.residentName && (
                          <span className="text-[10px] text-slate-500 font-normal ml-auto border-l border-slate-200 pl-2">
                            Aut: {vis.residentName}
                          </span>
                        )}
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    vis.status === 'ENTERED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    vis.status === 'APPROVED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      vis.status === 'ENTERED' ? 'bg-emerald-500' :
                      vis.status === 'APPROVED' ? 'bg-blue-500' : 'bg-slate-400'
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
                      onClick={() => {
                        recordVisitorEntry(vis.id);
                        notificationService.showToast(`Ingreso registrado para ${vis.name}`, 'success');
                      }}
                      className="flex-1 min-h-[40px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <LogIn className="w-4 h-4" />
                      Ingreso
                    </button>
                  )}
                  {vis.status === 'ENTERED' && (
                    <button
                      onClick={() => {
                        recordVisitorExit(vis.id);
                        notificationService.showToast(`Salida registrada para ${vis.name}`, 'success');
                      }}
                      className="flex-1 min-h-[40px] px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <LogOut className="w-4 h-4" />
                      Salida
                    </button>
                  )}
                  <button 
                    onClick={() => handleOpenEdit(vis)}
                    className="min-h-[40px] px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  {(vis.status === 'APPROVED' || vis.status === 'PENDING') && (
                    <button 
                      onClick={() => handleDelete(vis.id, vis.name)}
                      className="min-h-[40px] px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Cancelar
                    </button>
                  )}
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
                <th className="px-6 py-3.5 font-semibold">Placa</th>
                <th className="px-6 py-3.5 font-semibold">Estado</th>
                <th className="px-6 py-3.5 font-semibold">Horario</th>
                <th className="px-6 py-3.5 font-semibold text-right">Acción Rápida</th>
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
                          Doc: {vis.documentId}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs">
                          {vis.propertyName || vis.propertyId}
                        </span>
                        {vis.residentName && (
                          <div className="text-[10px] text-slate-500 mt-1.5 font-normal ml-1">
                            Aut: {vis.residentName}
                          </div>
                        )}
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
                            onClick={() => {
                              recordVisitorEntry(vis.id);
                              notificationService.showToast(`Ingreso registrado para ${vis.name}`, 'success');
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <LogIn className="w-3.5 h-3.5" /> Ingreso
                          </button>
                        )}
                        {vis.status === 'ENTERED' && (
                          <button
                            onClick={() => {
                              recordVisitorExit(vis.id);
                              notificationService.showToast(`Salida registrada para ${vis.name}`, 'success');
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <LogOut className="w-3.5 h-3.5" /> Salida
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenEdit(vis)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {(vis.status === 'APPROVED' || vis.status === 'PENDING') && (
                          <button 
                            onClick={() => handleDelete(vis.id, vis.name)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Cancelar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                {editingVisitor ? 'Editar Datos de Visita' : 'Registro Rápido de Visitante'}
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
                id="sec-vis-name"
                label="Nombre del visitante"
                required
                error={errors.name}
              >
                <input
                  id="sec-vis-name"
                  name="name"
                  type="text"
                  maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: '' });
                  }}
                  placeholder="Ej. Juan Manuel Santos"
                  aria-invalid={Boolean(errors.name)}
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                    errors.name ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                  }`}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="sec-vis-doc"
                  label="Documento"
                  required
                  error={errors.documentId}
                >
                  <input
                    id="sec-vis-doc"
                    name="documentId"
                    type="text"
                    maxLength={FIELD_LIMITS.DOCUMENT_MAX_LENGTH}
                    value={formData.documentId}
                    onChange={(e) => {
                      setFormData({ ...formData, documentId: e.target.value });
                      if (errors.documentId) setErrors({ ...errors, documentId: '' });
                    }}
                    placeholder="C.C. 71234567"
                    aria-invalid={Boolean(errors.documentId)}
                    className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                      errors.documentId ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                    }`}
                  />
                </FormField>

                <FormField
                  id="sec-vis-plate"
                  label="Placa vehículo"
                  error={errors.vehiclePlate}
                >
                  <input
                    id="sec-vis-plate"
                    name="vehiclePlate"
                    type="text"
                    maxLength={FIELD_LIMITS.VEHICLE_PLATE_MAX_LENGTH}
                    value={formData.vehiclePlate}
                    onChange={(e) => {
                      setFormData({ ...formData, vehiclePlate: e.target.value.toUpperCase() });
                      if (errors.vehiclePlate) setErrors({ ...errors, vehiclePlate: '' });
                    }}
                    placeholder="XYZ 789"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="sec-vis-property"
                  label="Destino / Apartamento"
                  required
                  error={errors.propertyId}
                >
                  <button
                    type="button"
                    onClick={() => setIsPropSelectorOpen(true)}
                    className="w-full px-3 py-2 text-left text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 flex items-center justify-between"
                  >
                    <span className="truncate">
                      {tenantProperties.find(p => p.id === formData.propertyId)?.path || 
                       tenantProperties.find(p => p.path === formData.propertyId)?.path || 
                       (formData.propertyId ? formData.propertyId : 'Seleccionar destino...')}
                    </span>
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                </FormField>

                <FormField
                  id="sec-vis-status"
                  label="Estado"
                >
                  <select
                    id="sec-vis-status"
                    name="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="ENTERED">Ingreso Inmediato</option>
                    <option value="APPROVED">Pre-Autorizado</option>
                    <option value="EXITED">Salió</option>
                  </select>
                </FormField>
              </div>

              <FormField
                id="sec-vis-obs"
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
                  id="sec-vis-obs"
                  name="observations"
                  rows={2}
                  maxLength={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Observaciones de portería..."
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
                  {editingVisitor ? 'Guardar Cambios' : 'Registrar e Ingresar'}
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick QR Validation & Group Arrival Modal */}
      {isScannerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onKeyDown={(e) => { if (e.key === 'Escape') setIsScannerOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Validación de Pase QR</h3>
                  <p className="text-xs text-slate-400">Control rápido de acceso en portería</p>
                </div>
              </div>
              <button 
                onClick={() => setIsScannerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {scannedGroup && scannedGroup.length > 0 ? (
              scannedGroup.some(v => v.status === 'CANCELLED') ? (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                    <X className="w-8 h-8 text-rose-500" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Visita Cancelada</h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm">Esta visita fue cancelada por el residente y este pase QR ya no es válido.</p>
                </div>
              ) : scannedGroup.some(v => v.status === 'EXPIRED') ? (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                    <X className="w-8 h-8 text-rose-500" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Pase Expirado</h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm">Este pase superó las 12 horas de validez y ya no puede ser utilizado. El residente debe generar una nueva visita.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-emerald-800 tracking-wider">
                        VISITA AUTORIZADA
                      </span>
                      <span className="text-xs font-black text-emerald-900 bg-white/80 px-2 py-0.5 rounded-md">
                        {scannedGroup[0].propertyId}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {scannedGroup[0].visitPurpose || scannedGroup[0].groupName || 'Visita autorizada'}
                    </h4>
                    <div className="text-xs text-slate-600">
                      Esperados: {formatTime(scannedGroup[0].expectedAt)}
                    </div>
                  </div>

                  {/* Individual check-in for members */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Integrantes ({scannedGroup.length}):</span>
                      {scannedGroup.some(v => v.status === 'APPROVED') && scannedGroup.length > 1 && (
                        <button
                          onClick={() => {
                            if (scannedGroup[0].groupId) {
                              recordGroupEntry(scannedGroup[0].groupId);
                            } else {
                              scannedGroup.forEach(v => recordVisitorEntry(v.id));
                            }
                            notificationService.showToast('Se registró el ingreso de todos los integrantes', 'success');
                            setIsScannerOpen(false);
                          }}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ingresar a todos juntos
                        </button>
                      )}
                    </div>

                    <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto border border-slate-100 rounded-2xl">
                      {scannedGroup.map((member) => (
                        <div key={member.id} className="p-3 flex items-center justify-between gap-2 bg-white">
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-900 truncate">{member.name}</div>
                            <div className="text-[11px] text-slate-400">
                              DOC: {member.documentId} {member.vehiclePlate && `· Placa: ${member.vehiclePlate}`}
                            </div>
                          </div>

                          {member.status === 'ENTERED' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
                              <Check className="w-3 h-3" /> Adentro ({member.enteredAt?.split(',')[1]?.trim() || 'Hoy'})
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                recordVisitorEntry(member.id);
                                notificationService.showToast(`Ingreso registrado: ${member.name}`, 'success');
                                setScannedGroup(prev => prev ? prev.map(m => m.id === member.id ? { ...m, status: 'ENTERED' } : m) : null);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                            >
                              <LogIn className="w-3 h-3" /> Dar Ingreso
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={() => setIsScannerOpen(false)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold h-10"
                    >
                      Cerrar Validación
                    </Button>
                  </div>
                </div>
              )
            ) : scanError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                  <X className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Pase no encontrado</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
                  El código <strong>{qrCodeInput}</strong> no pertenece a ninguna visita autorizada o activa en este momento.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-2 w-full">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => { setScanError(false); setQrCodeInput(''); }}
                    className="flex-1 rounded-xl text-xs font-bold"
                  >
                    Volver a intentar
                  </Button>
                  <Button 
                    onClick={() => { setIsScannerOpen(false); setScanError(false); handleOpenCreate(); }}
                    className="flex-1 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl text-xs font-bold"
                  >
                    Registro manual
                  </Button>
                </div>
              </div>
            ) : (
              <form id="qr-search-form" onSubmit={handleSearchQR} className="space-y-4 py-2">
                <QRScanner 
                  onScan={(data) => {
                    setQrCodeInput(data);
                    setTimeout(() => {
                      const form = document.getElementById("qr-search-form") as HTMLFormElement;
                      if (form) form.requestSubmit();
                    }, 50);
                  }} 
                />
                
                <div>
                  <label htmlFor="qrInput" className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                    O digita el código manualmente:
                  </label>
                  <input
                    id="qrInput"
                    type="text"
                    value={qrCodeInput}
                    onChange={(e) => setQrCodeInput(e.target.value)}
                    placeholder="Ej. QR-12345"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/50 text-center font-bold tracking-widest uppercase"
                    autoFocus
                    autoComplete="off"
                  />
                </div>
                
                <div className="pt-2 flex justify-end gap-2">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setIsScannerOpen(false)}
                    className="rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl text-xs font-bold"
                    disabled={!qrCodeInput.trim()}
                  >
                    Validar Código
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      <PropertySelectorModal
        isOpen={isPropSelectorOpen}
        onClose={() => setIsPropSelectorOpen(false)}
        properties={tenantProperties}
        onSelect={(prop) => {
          setFormData({ ...formData, propertyId: prop.id });
          if (errors.propertyId) setErrors({ ...errors, propertyId: '' });
        }}
      />
    </div>
  );
};


