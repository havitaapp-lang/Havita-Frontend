import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Calendar, Plus, Clock, X, Trash2, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Reservation } from '../../types';
import { reservationSchema } from '../../validation/schemas/reservationSchema';
import { validateForm } from '../../validation/validators/formValidator';
import { FormField } from '../../components/ui/FormField';
import { FormErrorSummary } from '../../components/ui/FormErrorSummary';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { notificationService } from '../../services/notificationService';
import { normalizeWhitespace } from '../../utils/sanitizers';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';
import { FIELD_LIMITS } from '../../validation/rules/limits';

export const ResidentReservations = () => {
  const { user, activePropertyId, userProperties } = useAuth() as any;
  const { currentTenant } = useTenant();
  const { reservations, createReservation, deleteReservation, changeReservationStatus, commonZones } = useData();

  const activeProperty = userProperties?.find((prop: any) => prop.propertyId === activePropertyId);
  const myPropertyId = activeProperty?.name || activeProperty?.number || activePropertyId || user?.residentPropertyId || user?.propertyUnit || 'Mi Apartamento';
  const myResidentName = user?.name || 'Residente';
  
  const myReservations = reservations.filter(r => {
    if (activePropertyId && (r.propertyId === activePropertyId)) return true;
    if (activeProperty?.number && (r.propertyId === activeProperty.number)) return true;
    if (activeProperty?.name && (r.propertyId === activeProperty.name)) return true;
    if (!activePropertyId && user?.residentPropertyId && r.propertyId === user.residentPropertyId) return true;
    if (!activePropertyId && user?.propertyUnit && (r.propertyId === user.propertyUnit)) return true;
    if (r.residentName === myResidentName && !activePropertyId) return true;
    return false;
  });
  console.log("ALL RESERVATIONS:", reservations);
  console.log("MY RESERVATIONS:", myReservations);

  const todayStr = new Date().toISOString().split('T')[0];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    zone: '',
    date: '',
    startTime: '',
    endTime: '',
    guestsCount: '10',
    observations: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ field: string; message: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const selectedZone = commonZones.find(z => z.name === formData.zone);

  const { data: dayReservations = [], isLoading: isLoadingAvailability } = useQuery({
    queryKey: ['reservations', 'availability', selectedZone?.id, formData.date],
    queryFn: async () => {
      if (!selectedZone?.id || !formData.date) return [];
      const res = await apiClient.get<any[]>('/reservations/by-zone-and-date', {
        zoneId: selectedZone.id,
        date: formData.date
      });
      return Array.isArray(res) ? res : [];
    },
    enabled: !!selectedZone?.id && !!formData.date && isModalOpen
  });

  const handleOpenBooking = (zoneName: Reservation['zone']) => {
    setFormData({
      zone: zoneName,
      date: todayStr,
      startTime: '14:00',
      endTime: '18:00',
      guestsCount: '10',
      observations: ''
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
      propertyId: myPropertyId,
    };

    const validation = validateForm(reservationSchema, normalized);

    if (!validation.success) {
      setErrors(validation.errors);
      setErrorList(validation.errorList);
      return;
    }

    if (!formData.zone) {
      setErrors({ zone: 'Por favor seleccione una zona común.' });
      setErrorList([{ field: 'zone', message: 'Por favor seleccione una zona común.' }]);
      return;
    }

    const currentZone = commonZones.find(z => z.name === formData.zone);
    if (!currentZone) {
      setErrors({ zone: 'La zona seleccionada no existe.' });
      setErrorList([{ field: 'zone', message: 'La zona seleccionada no existe.' }]);
      return;
    }

    // Verificar si el día está deshabilitado para esta zona
    const selectedZone = commonZones.find(z => z.name === formData.zone);
    if (selectedZone) {
      if (selectedZone.disabledDays) {
        const dateObj = new Date(formData.date + 'T12:00:00'); // Mediodía para evitar problemas de huso horario
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

    const overlaps = dayReservations.some((r: any) => {
      return formData.startTime < r.endTime && formData.endTime > r.startTime;
    });

    if (overlaps) {
      const errorMsg = 'El horario seleccionado choca con otra reserva existente.';
      setErrors({ startTime: errorMsg, endTime: errorMsg });
      setErrorList([{ field: 'startTime', message: errorMsg }]);
      return;
    }

    setErrors({});
    setErrorList([]);
    setIsSubmitting(true);

    try {
      await new Promise(r => setTimeout(r, 400));

      await createReservation({
        commonZoneId: selectedZone?.id || '',
        zone: normalized.zone,
        date: normalized.date,
        startTime: normalized.startTime,
        endTime: normalized.endTime,
        guestsCount: normalized.attendees,
        observations: formData.observations ? normalizeWhitespace(formData.observations) : undefined,
        propertyId: myPropertyId,
        residentName: myResidentName,
        status: 'PENDING',
        tenantId: currentTenant?.id || 'tenant-limonar'
      });

      notificationService.showToast('Reserva solicitada. Pendiente de aprobación.', 'success');
      setIsModalOpen(false);
    } catch {
      notificationService.showError('Error al reservar', 'No fue posible completar la reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (id: string, zone: string, date: string) => {
    const confirmed = await notificationService.showConfirm(
      '¿Cancelar reserva?',
      `¿Deseas cancelar la reserva para ${zone} el ${date}? Esta acción liberará el cupo.`,
      'Sí, cancelar reserva',
      'Mantener'
    );

    if (confirmed) {
      changeReservationStatus(id, 'Cancelada', 'Cancelada por el residente');
      notificationService.showToast('Reserva cancelada correctamente', 'success');
    }
  };

  const totalPages = Math.ceil(myReservations.length / ITEMS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedReservations = myReservations.slice((validCurrentPage - 1) * ITEMS_PER_PAGE, validCurrentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Reservas de Zonas Comunes</h2>
          <p className="text-slate-500 text-xs">Separa tu espacio para eventos y descanso.</p>
        </div>
        <Button onClick={() => handleOpenBooking('')} className="bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl text-xs shadow-sm">
          <Plus className="w-4 h-4 mr-1.5" /> Nueva Reserva
        </Button>
      </div>

      {/* Available zones catalogue */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Zonas Disponibles</h3>
        <div className="grid grid-cols-2 gap-3">
          {commonZones.length === 0 && (
            <div className="col-span-2 text-center text-slate-500 py-6 text-sm border border-dashed border-slate-200 rounded-2xl">
              Aún no hay zonas comunes configuradas por la administración.
            </div>
          )}
          {commonZones.map((z) => (
            <Card key={z.id} className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between transition-colors ${
              z.status === 'INACTIVE' ? 'bg-slate-50 border-slate-200 opacity-90' : 'bg-white border-slate-200/80 hover:border-blue-300'
            }`}>
              <div>
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 text-sm">{z.name}</h4>
                  {z.status === 'INACTIVE' && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      CERRADA
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1 mt-1.5 mb-2">
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    Cap: {z.capacity} pax
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    {z.openTime || '08:00'} - {z.closeTime || '20:00'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{z.description || 'Sin descripción'}</p>
                
                {z.disabledDays && z.disabledDays.trim() !== '' && (
                  <div className="mt-2 text-[10px]">
                    <span className="font-semibold text-slate-600">No disponible: </span>
                    <span className="text-slate-500">
                      {z.disabledDays.split(',').map(d => {
                        const days: Record<string, string> = {
                          'MONDAY': 'Lunes', 'TUESDAY': 'Martes', 'WEDNESDAY': 'Miércoles',
                          'THURSDAY': 'Jueves', 'FRIDAY': 'Viernes', 'SATURDAY': 'Sábado', 'SUNDAY': 'Domingo'
                        };
                        return days[d.trim()] || d;
                      }).join(', ')}
                    </span>
                  </div>
                )}

                {z.status === 'INACTIVE' && z.disabledMessage && (
                  <p className="text-xs font-semibold text-rose-600 mt-2 bg-rose-50/50 p-1.5 rounded-lg border border-rose-100">
                    {z.disabledMessage}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={z.status === 'INACTIVE'}
                onClick={() => handleOpenBooking(z.name as any)}
                className={`mt-3 w-full rounded-xl text-xs ${
                  z.status === 'INACTIVE'
                    ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                    : 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
                }`}
              >
                {z.status === 'INACTIVE' ? 'No disponible' : 'Reservar'}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* My Active Bookings */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Mis Reservas Activas</h3>
        <div className="space-y-3">
          {paginatedReservations.map((res) => (
            <Card key={res.id} className="p-4 rounded-2xl border border-slate-200/80 shadow-xs bg-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{res.zone}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    res.status === 'Confirmada' ? 'bg-emerald-100 text-emerald-800' :
                    res.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                    res.status === 'Rechazada' ? 'bg-rose-100 text-rose-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {res.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {res.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {res.startTime} - {res.endTime}
                  </span>
                </div>
                {(res.observations || res.adminNotes) && (
                  <div className="mt-2 space-y-1.5">
                    {res.observations && (
                      <div className="text-xs bg-slate-50 p-2 rounded-lg text-slate-600 border border-slate-100">
                        <span className="font-semibold block mb-0.5 text-slate-700">Mi nota:</span>
                        {res.observations}
                      </div>
                    )}
                    {res.adminNotes && (
                      <div className={`text-xs p-2 rounded-lg border ${
                        res.status === 'Rechazada' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        res.status === 'Cancelada' ? 'bg-slate-50 text-slate-600 border-slate-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        <span className="font-semibold block mb-0.5">
                          {res.status === 'Cancelada' ? 'Cancelada:' : 
                           res.status === 'Rechazada' ? 'Motivo de rechazo:' : 
                           'Nota del administrador:'}
                        </span>
                        {res.adminNotes}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setFormData({
                      zone: res.zone,
                      date: todayStr,
                      startTime: res.startTime,
                      endTime: res.endTime,
                      guestsCount: res.guestsCount ? String(res.guestsCount) : '10',
                      observations: res.observations || ''
                    });
                    setErrors({});
                    setErrorList([]);
                    setIsModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-blue-200"
                  title="Repetir esta reserva para hoy"
                >
                  Repetir
                </button>
                {res.status === 'PENDING' && (
                  <button
                    onClick={() => handleCancelBooking(res.id, res.zone, res.date)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Cancelar reserva"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}

          {myReservations.length === 0 && (
            <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No tienes reservas programadas.</p>
              <p className="mt-1">Selecciona una zona común arriba para separar tu fecha y hora.</p>
            </div>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-3xl border border-slate-200/80 shadow-xs mt-4">
            <span className="text-xs text-slate-500 font-medium">
              Mostrando {(validCurrentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(validCurrentPage * ITEMS_PER_PAGE, myReservations.length)} de {myReservations.length} reservas
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={validCurrentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 min-w-[2rem] text-center">
                {validCurrentPage} / {totalPages}
              </span>
              <button
                disabled={validCurrentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Reservar Zona */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isSubmitting) setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Reservar {formData.zone}</h3>
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
                id="res-zone"
                label="Zona común"
                required
                error={errors.zone}
              >
                <select
                  id="res-zone"
                  name="zone"
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Seleccione una zona</option>
                  {commonZones.filter(z => z.status === 'ACTIVE').map(z => (
                    <option key={z.id} value={z.name}>{z.name} (Cap: {z.capacity})</option>
                  ))}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="res-date"
                  label="Fecha"
                  required
                  error={errors.date}
                >
                  <input
                    id="res-date"
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
                  id="res-guests"
                  label="Asistentes"
                  required
                  error={errors.attendees}
                >
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="res-guests"
                      name="guestsCount"
                      type="number"
                      min={FIELD_LIMITS.RESERVATION_MIN_ATTENDEES}
                      max={FIELD_LIMITS.RESERVATION_MAX_ATTENDEES}
                      value={formData.guestsCount}
                      onChange={(e) => setFormData({ ...formData, guestsCount: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </FormField>
              </div>

              {selectedZone && formData.date && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                  <div className="font-semibold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Disponibilidad el {formData.date}</span>
                    {isLoadingAvailability && <span className="text-slate-400">Cargando...</span>}
                  </div>
                  {dayReservations.length > 0 ? (
                    <div className="space-y-1.5">
                      {dayReservations.map((r: any) => (
                        <div key={r.id} className="flex items-center gap-2 text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-medium">Ocupado:</span> {r.startTime} - {r.endTime}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-emerald-600 font-medium">✨ Todo el día disponible</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="res-start"
                  label="Hora de inicio"
                  required
                  error={errors.startTime}
                >
                  <select
                    id="res-start"
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
                  id="res-end"
                  label="Hora de finalización"
                  required
                  error={errors.endTime}
                >
                  <select
                    id="res-end"
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
                  loadingText="Confirmando..."
                  className="rounded-xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white"
                >
                  Confirmar Reserva
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
