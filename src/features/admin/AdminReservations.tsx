import React, { useState, useMemo, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Search, Plus, Calendar as CalendarIcon, Edit, Trash2, X, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useTenant } from '../../contexts/TenantContext';
import type { Reservation } from '../../types';
import { reservationSchema } from '../../validation/schemas/reservationSchema';
import { validateForm } from '../../validation/validators/formValidator';
import { FormField } from '../../components/ui/FormField';
import { FormErrorSummary } from '../../components/ui/FormErrorSummary';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { notificationService } from '../../services/notificationService';
import { normalizeWhitespace } from '../../utils/sanitizers';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import { AdminCommonZonesTab } from './AdminCommonZonesTab';
import type { AdminCommonZonesTabRef } from './AdminCommonZonesTab';

const ITEMS_PER_PAGE = 8;

export const AdminReservations = () => {
  const { currentTenant } = useTenant();
  const { reservations, commonZones, createReservation, updateReservation, deleteReservation, changeReservationStatus, properties } = useData();
  const zonesTabRef = useRef<AdminCommonZonesTabRef>(null);

  const getPropertyPath = (propertyId: string) => {
    const prop = properties.find(p => p.id === propertyId || p.name === propertyId);
    if (!prop) return propertyId;
    return prop.path ? prop.path.replace(/ -> /g, '-') : prop.name;
  };

  const tenantId = currentTenant?.id || 'tenant-limonar';
  const tenantReservations = useMemo(() => {
    return reservations.filter((r) => r.tenantId === tenantId);
  }, [reservations, tenantId]);

  const tenantProperties = useMemo(() => {
    return properties.filter((p) => p.tenantId === tenantId);
  }, [properties, tenantId]);

  const [activeTab, setActiveTab] = useState<'RESERVATIONS' | 'ZONES'>('RESERVATIONS');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterZone, setFilterZone] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);

  const todayStr = new Date().toISOString().split('T')[0];

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResv, setEditingResv] = useState<Reservation | null>(null);
  const [formData, setFormData] = useState({
    propertyId: tenantProperties[0]?.name || 'Torre 1 - 101',
    residentName: tenantProperties[0]?.residentName || 'Residente',
    zone: 'Zona BBQ' as Reservation['zone'],
    date: todayStr,
    startTime: '13:00',
    endTime: '18:00',
    guestsCount: 15,
    status: 'Confirmada' as Reservation['status'],
    observations: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ field: string; message: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredReservations = tenantReservations.filter(r => {
    const matchesSearch = !searchTerm ||
      r.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.propertyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.zone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesZone = filterZone === 'Todos' || r.zone === filterZone;
    const matchesStatus = filterStatus === 'Todos' || r.status === filterStatus;
    return matchesSearch && matchesZone && matchesStatus;
  });

  const totalPages = Math.ceil(filteredReservations.length / ITEMS_PER_PAGE) || 1;
  const paginatedReservations = filteredReservations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleOpenCreate = () => {
    setEditingResv(null);
    setFormData({
      propertyId: tenantProperties[0]?.name || 'Torre 1 - 101',
      residentName: tenantProperties[0]?.residentName || 'Administración',
      zone: 'Zona BBQ',
      date: todayStr,
      startTime: '14:00',
      endTime: '18:00',
      guestsCount: 12,
      status: 'Confirmada',
      observations: ''
    });
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (resv: Reservation) => {
    setEditingResv(resv);
    setFormData({
      propertyId: resv.propertyId,
      residentName: resv.residentName,
      zone: resv.zone,
      date: resv.date,
      startTime: resv.startTime,
      endTime: resv.endTime,
      guestsCount: resv.guestsCount || 10,
      status: resv.status,
      observations: resv.observations || ''
    });
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalized = {
      zone: formData.zone,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      attendees: Number(formData.guestsCount),
      propertyId: formData.propertyId.trim(),
    };

    const validation = validateForm(reservationSchema, normalized);

    if (!validation.success) {
      setErrors(validation.errors);
      setErrorList(validation.errorList);
      return;
    }

    // Verificar días deshabilitados y horarios
    const selectedZone = commonZones.find(z => z.name === formData.zone);
    if (selectedZone) {
      if (selectedZone.disabledDays) {
        const dateObj = new Date(formData.date + 'T12:00:00');
        const daysMap = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const dayName = daysMap[dateObj.getDay()];
        
        const disabledArray = selectedZone.disabledDays.split(',').map(d => d.trim());
        if (disabledArray.includes(dayName)) {
          const errorMsg = 'Esta zona no se puede reservar los días seleccionados por mantenimiento.';
          setErrors({ date: errorMsg });
          setErrorList([{ field: 'date', message: errorMsg }]);
          return;
        }
      }

      // Validar horarios de apertura y cierre
      const openTime = selectedZone.openTime || '08:00';
      const closeTime = selectedZone.closeTime || '20:00';
      
      if (formData.startTime < openTime || formData.endTime > closeTime) {
        const errorMsg = `El horario permitido para esta zona es de ${openTime} a ${closeTime}.`;
        setErrors({ startTime: errorMsg, endTime: errorMsg });
        setErrorList([{ field: 'startTime', message: errorMsg }]);
        return;
      }
    }

    setErrors({});
    setErrorList([]);
    setIsSubmitting(true);

    try {
      await new Promise(r => setTimeout(r, 400));

      if (editingResv) {
        updateReservation(editingResv.id, {
          ...normalized,
          guestsCount: normalized.attendees,
          residentName: formData.residentName.trim(),
          status: formData.status,
          observations: formData.observations ? normalizeWhitespace(formData.observations) : undefined,
        });
        notificationService.showToast('Reserva actualizada correctamente', 'success');
      } else {
        await createReservation({
          ...normalized,
          commonZoneId: selectedZone?.id || '',
          guestsCount: normalized.attendees,
          residentName: formData.residentName.trim(),
          status: formData.status,
          observations: formData.observations ? normalizeWhitespace(formData.observations) : undefined,
          tenantId: currentTenant?.id || 'tenant-limonar'
        });
        notificationService.showToast('Reserva registrada exitosamente', 'success');
      }

      setIsModalOpen(false);
    } catch {
      notificationService.showError('Error al reservar', 'No fue posible completar la reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, zone: string) => {
    const confirmed = await notificationService.showConfirm(
      '¿Eliminar reserva?',
      `¿Deseas cancelar y eliminar la reserva para ${zone}? Esta acción no se puede deshacer.`,
      'Sí, eliminar',
      'Cancelar'
    );

    if (confirmed) {
      deleteReservation(id);
      notificationService.showToast('Reserva eliminada', 'success');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Reservas de Zonas Comunes</h2>
            <p className="text-slate-500 text-sm">Gestiona la agenda y configuración de zonas.</p>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setActiveTab('RESERVATIONS')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'RESERVATIONS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Reservas
            </button>
            <button
              onClick={() => setActiveTab('ZONES')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'ZONES' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Zonas
            </button>
          </div>
        </div>

        <div className="shrink-0 flex items-center">
          {activeTab === 'RESERVATIONS' ? (
            <Button onClick={handleOpenCreate} className="bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Nueva Reserva
            </Button>
          ) : (
            <Button onClick={() => zonesTabRef.current?.openCreateModal()} className="bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Nueva Zona
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'ZONES' ? (
        <AdminCommonZonesTab ref={zonesTabRef} />
      ) : (
        <>
          {/* Table Card */}
          <Card className="overflow-hidden border border-slate-200/80 rounded-2xl shadow-sm bg-white">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 bg-slate-50/70">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="search"
              maxLength={FIELD_LIMITS.SEARCH_MAX_LENGTH}
              placeholder="Buscar por residente, unidad o zona común..." 
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
              value={filterZone}
              onChange={(e) => {
                setFilterZone(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="Todos">Todas las zonas</option>
              {commonZones.map(z => (
                <option key={z.id} value={z.name}>{z.name}</option>
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
              <option value="Confirmada">Confirmada</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
        </div>
        
        {/* Mobile Cards List (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {paginatedReservations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No se encontraron reservas con los filtros actuales.
            </div>
          ) : (
            paginatedReservations.map((resv) => (
              <div key={resv.id} className="p-4 space-y-3 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                      <CalendarIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{resv.zone}</h4>
                      <div className="text-xs text-slate-500 font-medium">
                        {resv.residentName || 'Residente'} • {getPropertyPath(resv.propertyId)}
                      </div>
                      {(resv.observations || resv.adminNotes) && (
                        <div className="space-y-1.5 mt-2">
                          {resv.observations && (
                            <div className="text-[11px] leading-tight text-slate-500 bg-slate-50 p-1.5 rounded-md border border-slate-100">
                              <span className="font-semibold block text-slate-700">Nota Residente:</span>
                              {resv.observations}
                            </div>
                          )}
                          {resv.adminNotes && (
                            <div className="text-[11px] leading-tight text-amber-600 bg-amber-50 p-1.5 rounded-md border border-amber-100">
                              <span className="font-semibold block text-amber-800">
                                {resv.status === 'Rechazada' ? 'Motivo de rechazo:' :
                                 resv.status === 'Cancelada' ? 'Cancelada:' :
                                 'Nota Admin:'}
                              </span>
                              {resv.adminNotes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    resv.status === 'Confirmada' ? 'bg-emerald-50 text-emerald-700' :
                    resv.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                    resv.status === 'Rechazada' ? 'bg-rose-50 text-rose-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      resv.status === 'Confirmada' ? 'bg-emerald-500' :
                      resv.status === 'PENDING' ? 'bg-amber-500' :
                      resv.status === 'Rechazada' ? 'bg-rose-500' :
                      'bg-slate-400'
                    }`} />
                    {resv.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Fecha & Hora</span>
                    <span className="text-slate-700 font-semibold">{resv.date}</span>
                    <div className="text-slate-500 text-[11px]">{resv.startTime} - {resv.endTime}</div>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Aforo Esperado</span>
                    <span className="inline-flex items-center gap-1 text-slate-700 font-medium mt-0.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {resv.guestsCount || 10} personas
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {resv.status === 'PENDING' && (
                    <>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const notes = await notificationService.showPrompt(
                            'Aprobar Reserva',
                            '¿Deseas agregar alguna anotación para el residente? (Opcional)',
                            'Ej. Asegúrate de leer el reglamento...',
                            'Aprobar'
                          );
                          if (notes !== null) {
                            changeReservationStatus(resv.id, 'Confirmada', notes);
                            notificationService.showToast('Reserva confirmada', 'success');
                          }
                        }}
                        className="flex-1 min-h-[40px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const notes = await notificationService.showPrompt(
                            'Rechazar Reserva',
                            'Indica el motivo del rechazo (Opcional)',
                            'Ej. Mantenimiento programado...',
                            'Rechazar'
                          );
                          if (notes !== null) {
                            changeReservationStatus(resv.id, 'Rechazada', notes);
                            notificationService.showToast('Reserva rechazada', 'error');
                          }
                        }}
                        className="flex-1 min-h-[40px] px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => handleOpenEdit(resv)}
                    className="min-h-[40px] px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(resv.id, resv.zone)}
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
                <th className="px-6 py-3.5 font-semibold">Zona Común</th>
                <th className="px-6 py-3.5 font-semibold">Solicitante / Unidad</th>
                <th className="px-6 py-3.5 font-semibold">Fecha & Horario</th>
                <th className="px-6 py-3.5 font-semibold">Aforo</th>
                <th className="px-6 py-3.5 font-semibold">Estado</th>
                <th className="px-6 py-3.5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedReservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No se encontraron reservas con los filtros actuales.
                  </td>
                </tr>
              ) : (
                paginatedReservations.map((resv) => (
                  <tr key={resv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 mt-0.5 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <CalendarIcon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="font-bold text-slate-900">{resv.zone}</span>
                          {(resv.observations || resv.adminNotes) && (
                            <div className="space-y-1">
                              {resv.observations && (
                                <div className="text-[11px] leading-tight text-slate-500 bg-slate-50 p-1.5 rounded-md border border-slate-100 max-w-xs">
                                  <span className="font-semibold block text-slate-700">Nota Residente:</span>
                                  {resv.observations}
                                </div>
                              )}
                              {resv.adminNotes && (
                                <div className="text-[11px] leading-tight text-amber-600 bg-amber-50 p-1.5 rounded-md border border-amber-100 max-w-xs">
                                  <span className="font-semibold block text-amber-800">
                                    {resv.status === 'Rechazada' ? 'Motivo de rechazo:' :
                                     resv.status === 'Cancelada' ? 'Cancelada:' :
                                     'Nota Admin:'}
                                  </span>
                                  {resv.adminNotes}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      <div>{resv.residentName || 'Residente'}</div>
                      <div className="text-xs text-slate-400 font-normal">{getPropertyPath(resv.propertyId)}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <div className="font-semibold text-slate-800">{resv.date}</div>
                      <div className="text-slate-400">{resv.startTime} - {resv.endTime}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {resv.guestsCount || 10} pers.
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        resv.status === 'Confirmada' ? 'bg-emerald-50 text-emerald-700' :
                        resv.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                        resv.status === 'Rechazada' ? 'bg-rose-50 text-rose-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          resv.status === 'Confirmada' ? 'bg-emerald-500' :
                          resv.status === 'PENDING' ? 'bg-amber-500' :
                          resv.status === 'Rechazada' ? 'bg-rose-500' :
                          'bg-slate-400'
                        }`} />
                        {resv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {resv.status === 'PENDING' && (
                          <>
                            <button
                              onClick={async () => {
                                const notes = await notificationService.showPrompt(
                                  'Aprobar Reserva',
                                  '¿Deseas agregar alguna anotación para el residente? (Opcional)',
                                  'Ej. Asegúrate de leer el reglamento...',
                                  'Aprobar'
                                );
                                if (notes !== null) {
                                  changeReservationStatus(resv.id, 'Confirmada', notes);
                                  notificationService.showToast('Reserva confirmada', 'success');
                                }
                              }}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={async () => {
                                const notes = await notificationService.showPrompt(
                                  'Rechazar Reserva',
                                  'Indica el motivo del rechazo (Opcional)',
                                  'Ej. Mantenimiento programado...',
                                  'Rechazar'
                                );
                                if (notes !== null) {
                                  changeReservationStatus(resv.id, 'Rechazada', notes);
                                  notificationService.showToast('Reserva rechazada', 'error');
                                }
                              }}
                              className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => handleOpenEdit(resv)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(resv.id, resv.zone)}
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
        {filteredReservations.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredReservations.length)} de {filteredReservations.length} reservas
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

      {/* Modal Registrar / Editar Reserva */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isSubmitting) setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingResv ? 'Editar Reserva' : 'Nueva Reserva de Zona Común'}
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
                id="admin-res-zone"
                label="Zona común"
                required
                error={errors.zone}
              >
                <select
                  id="admin-res-zone"
                  name="zone"
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Seleccione una zona</option>
                  {commonZones.map(z => (
                    <option key={z.id} value={z.name}>{z.name}</option>
                  ))}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="admin-res-property"
                  label="Unidad / Solicitante"
                  required
                  error={errors.propertyId}
                >
                  <select
                    id="admin-res-property"
                    name="propertyId"
                    value={formData.propertyId}
                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Seleccione inmueble</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  id="admin-res-resident"
                  label="Nombre del residente"
                >
                  <input
                    id="admin-res-resident"
                    name="residentName"
                    type="text"
                    maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                    value={formData.residentName}
                    onChange={(e) => setFormData({ ...formData, residentName: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="admin-res-date"
                  label="Fecha"
                  required
                  error={errors.date}
                >
                  <input
                    id="admin-res-date"
                    name="date"
                    type="date"
                    min={todayStr}
                    value={formData.date}
                    onChange={(e) => {
                      setFormData({ ...formData, date: e.target.value });
                      if (errors.date) setErrors({ ...errors, date: '' });
                    }}
                    aria-invalid={Boolean(errors.date)}
                    className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                      errors.date ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                    }`}
                  />
                </FormField>

                <FormField
                  id="admin-res-guests"
                  label="Asistentes"
                  required
                  error={errors.attendees}
                >
                  <input
                    id="admin-res-guests"
                    name="guestsCount"
                    type="number"
                    min={FIELD_LIMITS.RESERVATION_MIN_ATTENDEES}
                    max={FIELD_LIMITS.RESERVATION_MAX_ATTENDEES}
                    value={formData.guestsCount}
                    onChange={(e) => setFormData({ ...formData, guestsCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="admin-res-start"
                  label="Hora de inicio"
                  required
                  error={errors.startTime}
                >
                  <select
                    id="admin-res-start"
                    name="startTime"
                    value={formData.startTime}
                    onChange={(e) => {
                      setFormData({ ...formData, startTime: e.target.value });
                      if (errors.startTime) setErrors({ ...errors, startTime: '' });
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Seleccione hora</option>
                    {(() => {
                      const z = commonZones.find(z => z.name === formData.zone);
                      const start = parseInt((z?.openTime || '08:00').split(':')[0]);
                      const end = parseInt((z?.closeTime || '20:00').split(':')[0]);
                      return Array.from({ length: end - start + 1 }, (_, i) => {
                        const hr = String(start + i).padStart(2, '0');
                        return <option key={`${hr}:00`} value={`${hr}:00`}>{hr}:00</option>;
                      });
                    })()}
                  </select>
                </FormField>

                <FormField
                  id="admin-res-end"
                  label="Hora fin"
                  required
                  error={errors.endTime}
                >
                  <select
                    id="admin-res-end"
                    name="endTime"
                    value={formData.endTime}
                    onChange={(e) => {
                      setFormData({ ...formData, endTime: e.target.value });
                      if (errors.endTime) setErrors({ ...errors, endTime: '' });
                    }}
                    aria-invalid={Boolean(errors.endTime)}
                    className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                      errors.endTime ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                    }`}
                  >
                    <option value="">Seleccione hora</option>
                    {(() => {
                      const z = commonZones.find(z => z.name === formData.zone);
                      const start = parseInt((z?.openTime || '08:00').split(':')[0]);
                      const end = parseInt((z?.closeTime || '20:00').split(':')[0]);
                      return Array.from({ length: end - start + 1 }, (_, i) => {
                        const hr = String(start + i).padStart(2, '0');
                        return <option key={`${hr}:00`} value={`${hr}:00`}>{hr}:00</option>;
                      });
                    })()}
                  </select>
                </FormField>
              </div>

              <FormField
                id="admin-res-status"
                label="Estado de reserva"
              >
                <select
                  id="admin-res-status"
                  name="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Confirmada">Confirmada</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
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
                  {editingResv ? 'Guardar Cambios' : 'Confirmar Reserva'}
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};
