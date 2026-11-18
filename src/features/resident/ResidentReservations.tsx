import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Calendar, Plus, Clock, X, Trash2, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveUnit } from '../../hooks/useActiveUnit';
import type { Reservation } from '../../types';
import { reservationSchema } from '../../validation/schemas/reservationSchema';
import { validateForm } from '../../validation/validators/formValidator';
import { FormField } from '../../components/ui/FormField';
import { FormErrorSummary } from '../../components/ui/FormErrorSummary';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { notificationService } from '../../services/notificationService';
import { normalizeWhitespace } from '../../utils/sanitizers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';
import { FIELD_LIMITS } from '../../validation/rules/limits';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  itemName: string;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemName,
}) => {
  if (totalItems === 0) return null;

  const startIdx = (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="pt-3 mt-1 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
      <div>
        Mostrando <span className="font-semibold text-slate-700">{startIdx}</span> a <span className="font-semibold text-slate-700">{endIdx}</span> de <span className="font-semibold text-slate-700">{totalItems}</span> {itemName}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all shadow-2xs font-semibold cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          <div className="flex items-center gap-1">
            {pages.map((p) => {
              if (totalPages > 7) {
                if (p !== 1 && p !== totalPages && Math.abs(p - currentPage) > 1) {
                  if (p === 2 || p === totalPages - 1) {
                    return <span key={p} className="px-1 text-slate-400 select-none">...</span>;
                  }
                  return null;
                }
              }

              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`w-7 h-7 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 shadow-2xs'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all shadow-2xs font-semibold cursor-pointer"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export const ResidentReservations = () => {
  const { user } = useAuth() as any;
  // Fase 2 / E2: única fuente de unidad (sin la cadena de fallbacks que acababa en la primera unidad).
  const { activeUnitId: activePropertyId, activeLabel } = useActiveUnit();
  const { currentTenant } = useTenant();
  const { reservations, createReservation, changeReservationStatus, commonZones } = useData();
  const queryClient = useQueryClient();

  const myPropertyUUID = activePropertyId || '';
  const myPropertyDisplay = activeLabel || 'Mi unidad';
  const myResidentName = user?.name || 'Residente';
  
  const currentUserId = user?.id;
  const myReservations = useMemo(() => {
    return reservations.filter(r => {
      // 1. Si la reserva tiene creador explícito, debe pertenecer al usuario actual
      const creatorId = r.createdByUserId || (r as any).creatorUserId || (r as any).createdByUser?.id;
      if (creatorId && currentUserId) {
        if (creatorId !== currentUserId) return false;
      } else {
        // Fallback: verificar por nombre del residente si no hay ID de creador
        if (r.residentName && myResidentName && r.residentName.trim().toLowerCase() !== myResidentName.trim().toLowerCase()) {
          return false;
        }
      }

      // 2. Solo reservas de la unidad activa (por id).
      return !!activePropertyId && r.propertyId === activePropertyId;
    });
  }, [reservations, currentUserId, myResidentName, activePropertyId]);

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

  const activeOccupiedReservations = useMemo(() => {
    return dayReservations.filter((r: any) => {
      const s = String(r.status || '').toUpperCase();
      return s !== 'CANCELLED' && s !== 'CANCELADA' && s !== 'REJECTED' && s !== 'RECHAZADA';
    });
  }, [dayReservations]);

  const handleOpenBooking = (zoneName: Reservation['zone']) => {
    setFormData({
      zone: zoneName,
      date: todayStr,
      startTime: '14:00',
      endTime: '18:00',
      guestsCount: String(Math.min(commonZones.find(z => z.name === zoneName)?.capacity || 10, 2)),
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
      propertyId: myPropertyUUID,
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
      if (selectedZone.capacity && normalized.attendees > selectedZone.capacity) {
        const errorMsg = `La capacidad máxima permitida para ${selectedZone.name} es de ${selectedZone.capacity} asistentes.`;
        setErrors({ attendees: errorMsg });
        setErrorList([{ field: 'attendees', message: errorMsg }]);
        return;
      }
    }

    const overlaps = activeOccupiedReservations.some((r: any) => {
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
        propertyId: myPropertyUUID,
        residentName: myResidentName,
        status: 'PENDING',
        tenantId: currentTenant?.id || 'tenant-limonar'
      });

      await queryClient.invalidateQueries({ queryKey: ['reservations'] });

      notificationService.showToast('Reserva solicitada. Pendiente de aprobación.', 'success');
      setIsModalOpen(false);
    } catch (err: any) {
      notificationService.showError('Error al reservar', err?.message || 'No fue posible completar la reserva.');
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
      try {
        await changeReservationStatus(id, 'Cancelada', 'Cancelada por el residente');
        await queryClient.invalidateQueries({ queryKey: ['reservations'] });
        notificationService.showToast('Reserva cancelada correctamente', 'success');
      } catch (err) {
        const message = (err as { data?: { message?: string } })?.data?.message;
        notificationService.showError('No se pudo cancelar', message || 'Inténtalo de nuevo en unos segundos.');
      }
    }
  };

  const sortedReservations = useMemo(() => {
    return [...myReservations].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return (b.startTime || '').localeCompare(a.startTime || '');
    });
  }, [myReservations]);

  const totalPages = Math.max(1, Math.ceil(sortedReservations.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedReservations = useMemo(() => {
    const start = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return sortedReservations.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedReservations, validCurrentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

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
                    res.status === 'Confirmada' || res.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                    res.status === 'PENDING' || res.status === 'Pendiente' ? 'bg-amber-100 text-amber-800' :
                    res.status === 'Rechazada' || res.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                    res.status === 'Cancelada' || res.status === 'CANCELLED' ? 'bg-slate-100 text-slate-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {res.status === 'CONFIRMED' ? 'Confirmada' :
                     res.status === 'PENDING' ? 'Pendiente' :
                     res.status === 'REJECTED' ? 'Rechazada' :
                     res.status === 'CANCELLED' ? 'Cancelada' :
                     res.status}
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
                        res.status === 'Rechazada' || res.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        res.status === 'Cancelada' || res.status === 'CANCELLED' ? 'bg-slate-50 text-slate-600 border-slate-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        <span className="font-semibold block mb-0.5">
                          {res.status === 'Cancelada' || res.status === 'CANCELLED' ? 'Cancelada:' : 
                           res.status === 'Rechazada' || res.status === 'REJECTED' ? 'Motivo de rechazo:' : 
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
                {(res.status === 'PENDING' || res.status === 'Pendiente') && (
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

          {sortedReservations.length === 0 && (
            <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No tienes reservas programadas.</p>
              <p className="mt-1">Selecciona una zona común arriba para separar tu fecha y hora.</p>
            </div>
          )}
        </div>

        {/* Paginación */}
        {sortedReservations.length > 0 && (
          <PaginationControls
            currentPage={validCurrentPage}
            totalPages={totalPages}
            totalItems={sortedReservations.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            itemName="reservas"
          />
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
                  onChange={(e) => {
                    const newZone = e.target.value as any;
                    const z = commonZones.find(item => item.name === newZone);
                    const maxCap = z?.capacity ? Number(z.capacity) : FIELD_LIMITS.RESERVATION_MAX_ATTENDEES;
                    let guests = formData.guestsCount;
                    if (guests !== '' && Number(guests) > maxCap) {
                      guests = String(maxCap);
                    }
                    setFormData({ ...formData, zone: newZone, guestsCount: guests });
                    if (errors.zone) setErrors(prev => ({ ...prev, zone: '' }));
                    if (errors.attendees) setErrors(prev => ({ ...prev, attendees: '' }));
                  }}
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
                      max={selectedZone?.capacity ? Number(selectedZone.capacity) : FIELD_LIMITS.RESERVATION_MAX_ATTENDEES}
                      value={formData.guestsCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        const maxCap = selectedZone?.capacity ? Number(selectedZone.capacity) : FIELD_LIMITS.RESERVATION_MAX_ATTENDEES;
                        if (val === '') {
                          setFormData({ ...formData, guestsCount: '' });
                          return;
                        }
                        const num = Number(val);
                        if (num > maxCap) {
                          setFormData({ ...formData, guestsCount: String(maxCap) });
                          setErrors(prev => ({
                            ...prev,
                            attendees: `La capacidad máxima permitida para ${selectedZone?.name || 'esta zona'} es de ${maxCap} personas.`
                          }));
                          return;
                        }
                        setFormData({ ...formData, guestsCount: val });
                        if (errors.attendees) setErrors(prev => ({ ...prev, attendees: '' }));
                      }}
                      className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                        errors.attendees ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-[var(--tenant-primary)] focus:ring-blue-100'
                      }`}
                    />
                  </div>
                  {selectedZone?.capacity && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Capacidad máxima: <span className="font-semibold text-slate-600">{selectedZone.capacity} personas</span>
                    </p>
                  )}
                </FormField>
              </div>

              {selectedZone && formData.date && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                  <div className="font-semibold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Disponibilidad el {formData.date}</span>
                    {isLoadingAvailability && <span className="text-slate-400">Cargando...</span>}
                  </div>
                  {activeOccupiedReservations.length > 0 ? (
                    <div className="space-y-1.5">
                      {activeOccupiedReservations.map((r: any) => (
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
