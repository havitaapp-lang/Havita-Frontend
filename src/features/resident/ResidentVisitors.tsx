import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  ShieldCheck, UserPlus, QrCode, Trash2, Edit, X, 
  Car, Copy, Check, Plus, Users, Clock, RotateCcw, ExternalLink,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Visitor } from '../../types';
import type { VisitorSettings } from '../../types/visitorSettings';
import { visitorSettingsService } from '../../services/visitorSettingsService';
import { FormErrorSummary } from '../../components/ui/FormErrorSummary';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { CharacterCounter } from '../../components/ui/CharacterCounter';
import { notificationService } from '../../services/notificationService';
import { maskDocument, normalizeWhitespace } from '../../utils/sanitizers';
import { formatDocumentInput, formatPlateInput, formatFriendlyDateTime } from '../../utils/formatters';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import { DateTimeAvailabilityPicker } from '../../components/ui/DateTimeAvailabilityPicker';
import { useDateTimeSlots } from '../../hooks/useDateTimeSlots';

interface PersonEntry {
  id: string;
  name: string;
  documentId: string;
  vehiclePlate?: string;
}

export const ResidentVisitors = () => {
  const { user, activePropertyId, userProperties } = useAuth();
  const { visitors, createGroupVisit, updateVisitor, deleteVisitor } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: visitorSettings = null } = useQuery({
    queryKey: ['visitor-settings'],
    queryFn: () => visitorSettingsService.getVisitorSettings(),
    staleTime: 1000 * 60 * 60, // 1 hora
    gcTime: 1000 * 60 * 60 * 24, // 24 horas
    retry: 1,
  });

  const { getSmartInitialDate, getSmartInitialTime, formatExpectedAt } = useDateTimeSlots(undefined, visitorSettings);

  // Identificador o número de propiedad del residente (si está definido)
  const myPropertyId = activePropertyId || user?.propertyUnit || 'Mi Unidad';
  const activeProperty = userProperties?.find(p => p.propertyId === activePropertyId);
  const activePropertyName = (activeProperty as any)?.path || activeProperty?.name || myPropertyId;
  
  // En el portal de residentes, el backend (`/resident/me/visitors`) ya devuelve única y exclusivamente
  // las visitas asociadas a la propiedad del residente autenticado. Por ende, si visitors tiene datos,
  // mostramos todas sus visitas sin descartarlas por discrepancia de texto ('Torre 1-Piso 2-Apto 1' vs 'Torre 2 - 504').
  const myVisitors = React.useMemo(() => {
    if (!visitors || visitors.length === 0) return [];
    // Filter out canceled visits from the resident's view
    const activeVisitors = visitors;
    
    // Si activePropertyId está definido y hay visitas con coincidencia, filtramos por esa propiedad
    const filtered = activeVisitors.filter(v => {
      if (activePropertyId && (v.propertyId === activePropertyId || (v as any).propertyId === activePropertyId)) {
        return true;
      }
      if (activeProperty?.number && (v.propertyId === activeProperty.number || (v as any).propertyNumber === activeProperty.number)) {
        return true;
      }
      if (activeProperty?.name && (v.propertyId === activeProperty.name || (v as any).propertyName === activeProperty.name)) {
        return true;
      }
      if (user?.residentPropertyId && v.propertyId === user.residentPropertyId) {
        return true;
      }
      if (user?.propertyUnit && (v.propertyId === user.propertyUnit || (v as any).propertyNumber === user.propertyUnit)) {
        return true;
      }
      return false;
    });

    // Si encontramos visitas específicas para esta unidad, las mostramos.
    // De lo contrario, como el endpoint del residente (/resident/me/visitors) ya está
    // acotado por seguridad en el backend a las unidades de este usuario, mostramos activeVisitors.
    return activePropertyId ? filtered : activeVisitors;
  }, [visitors, activePropertyId, user?.residentPropertyId, user?.propertyUnit, activeProperty]);

  // Group visitors by groupId or individual id
  const visitGroups = React.useMemo(() => {
    const groups: { [key: string]: Visitor[] } = {};
    myVisitors.forEach(v => {
      const key = v.groupId || v.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    });

    // Ordenar los grupos: 1. Autorizadas, 2. En curso/Adentro, 3. Finalizadas, 4. Expiradas
    return Object.values(groups).sort((groupA, groupB) => {
      const getPriority = (group: Visitor[]) => {
        if (group.every(v => v.status === 'EXITED')) return 3; // Finalizada
        if (group.every(v => v.status === 'EXPIRED')) return 4; // Expirada
        if (group.some(v => v.status === 'ENTERED' || v.status === 'EXITED')) return 2; // En curso o adentro
        return 1; // Autorizada
      };

      const priorityA = getPriority(groupA);
      const priorityB = getPriority(groupB);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Si tienen la misma prioridad, ordenamos por la más reciente primero
      const dateA = new Date(groupA[0].createdAt || 0).getTime();
        const dateB = new Date(groupB[0].createdAt || 0).getTime();
        if (!isNaN(dateB) && !isNaN(dateA) && dateB !== dateA) return dateB - dateA;
        return String(groupB[0].id).localeCompare(String(groupA[0].id));
    });
  }, [myVisitors]);

  // Invitados frecuentes / recientes derivados dinámicamente del historial real de visitas del residente
  const frequentGuests = React.useMemo(() => {
    const seen = new Set<string>();
    const guests: Array<{ name: string; documentId: string; vehiclePlate?: string }> = [];

    // Recorremos las visitas del residente (las más recientes primero)
    for (const v of myVisitors) {
      if (!v.documentId || !v.name) continue;
      const docClean = v.documentId.trim();
      if (!seen.has(docClean)) {
        seen.add(docClean);
        guests.push({
          name: v.name,
          documentId: docClean,
          vehiclePlate: v.vehiclePlate || '',
        });
      }
      if (guests.length >= 6) break; // Máximo 6 sugerencias recientes
    }

    return guests;
  }, [myVisitors]);

  // Modals & States
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [showQRGroup, setShowQRGroup] = useState<Visitor[] | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Pagination
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(visitGroups.length / ITEMS_PER_PAGE) || 1;
  // Asegurar que currentPage no se salga de los límites si se eliminan items
  const validCurrentPage = Math.min(currentPage, totalPages);
  const currentGroups = visitGroups.slice((validCurrentPage - 1) * ITEMS_PER_PAGE, validCurrentPage * ITEMS_PER_PAGE);

  // Form State: 1 visit, N persons
  const [visitPurpose, setVisitPurpose] = useState('Visita familiar');
  const [selectedDate, setSelectedDate] = useState(() => getSmartInitialDate());
  const [selectedTime, setSelectedTime] = useState(() => getSmartInitialTime(getSmartInitialDate(), '16:00'));
  const [observations, setObservations] = useState('');
  const [persons, setPersons] = useState<PersonEntry[]>([
    { id: '1', name: '', documentId: '', vehiclePlate: '' }
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ field: string; message: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreate = () => {
    const initDate = getSmartInitialDate();
    const initTime = getSmartInitialTime(initDate, '16:00');
    setEditingVisitor(null);
    setVisitPurpose('Visita familiar');
    setSelectedDate(initDate);
    setSelectedTime(initTime);
    setObservations('');
    setPersons([
      { id: '1', name: '', documentId: '', vehiclePlate: '' }
    ]);
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleAddPerson = () => {
    setPersons(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', documentId: '', vehiclePlate: '' }
    ]);
  };

  const handleRemovePerson = (id: string) => {
    if (persons.length <= 1) {
      notificationService.showToast('La visita debe incluir al menos una persona', 'info');
      return;
    }
    setPersons(prev => prev.filter(p => p.id !== id));
  };

  const handlePersonChange = (id: string, field: keyof PersonEntry, value: string) => {
    let finalValue = value;
    if (field === 'name') {
      finalValue = value.replace(/\d/g, ''); // Strip numbers
    } else if (field === 'documentId') {
      finalValue = value.replace(/\D/g, ''); // Strip non-numbers
    }
    setPersons(prev => prev.map(p => p.id === id ? { ...p, [field]: finalValue } : p));
  };

  const handleSelectFrequentGuest = (guest: { name: string; documentId: string; vehiclePlate?: string }) => {
    if (persons.length === 1 && !persons[0].name.trim()) {
      setPersons([{ id: '1', name: guest.name, documentId: guest.documentId, vehiclePlate: guest.vehiclePlate || '' }]);
    } else {
      if (persons.some(p => p.documentId === guest.documentId)) {
        notificationService.showToast(`${guest.name} ya está en la lista`, 'info');
        return;
      }
      setPersons(prev => [
        ...prev,
        { id: Date.now().toString(), name: guest.name, documentId: guest.documentId, vehiclePlate: guest.vehiclePlate || '' }
      ]);
    }
    notificationService.showToast(`Agregado: ${guest.name}`, 'success');
  };

  const handleRepeatVisit = (group: Visitor[]) => {
    const initDate = getSmartInitialDate();
    const initTime = getSmartInitialTime(initDate, '16:00');
    setEditingVisitor(null);
    setVisitPurpose(group[0]?.visitPurpose || group[0]?.groupName || 'Visita familiar');
    setSelectedDate(initDate);
    setSelectedTime(initTime);
    setObservations(group[0]?.observations || '');
    setPersons(group.map((v, i) => ({
      id: `${Date.now()}-${i}`,
      name: v.name,
      documentId: v.documentId,
      vehiclePlate: v.vehiclePlate || ''
    })));
    setIsModalOpen(true);
    notificationService.showToast('Datos de la visita anterior cargados para hoy', 'info');
  };

  const handleOpenEditSingle = (vis: Visitor) => {
    const initDate = getSmartInitialDate();
    const initTime = getSmartInitialTime(initDate, '16:00');
    setEditingVisitor(vis);
    setVisitPurpose(vis.visitPurpose || 'Visita');
    setSelectedDate(initDate);
    setSelectedTime(initTime);
    setObservations(vis.observations || '');
    setPersons([
      { id: vis.id, name: vis.name, documentId: vis.documentId, vehiclePlate: vis.vehiclePlate || '' }
    ]);
    setErrors({});
    setErrorList([]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const newErrorList: Array<{ field: string; message: string }> = [];

    persons.forEach((person, index) => {
      const trimmedName = person.name.trim();
      const trimmedDoc = person.documentId.trim();

      if (!trimmedName || trimmedName.length < 3) {
        newErrors[`person_${index}_name`] = 'El nombre debe tener al menos 3 letras.';
        newErrorList.push({ field: `Persona ${index + 1}`, message: 'Nombre requerido (mínimo 3 caracteres)' });
      } else if (trimmedName.length > FIELD_LIMITS.NAME_MAX_LENGTH) {
        newErrors[`person_${index}_name`] = `El nombre excede el límite de ${FIELD_LIMITS.NAME_MAX_LENGTH} caracteres.`;
        newErrorList.push({ field: `Persona ${index + 1}`, message: 'Nombre demasiado largo' });
      } else if (/\d/.test(trimmedName)) {
        newErrors[`person_${index}_name`] = 'El nombre no puede contener números.';
        newErrorList.push({ field: `Persona ${index + 1}`, message: 'El nombre no debe contener números' });
      }

      if (!trimmedDoc || trimmedDoc.length < 4) {
        newErrors[`person_${index}_doc`] = 'Documento inválido o incompleto.';
        newErrorList.push({ field: `Persona ${index + 1}`, message: 'Documento requerido (mínimo 4 dígitos)' });
      } else if (trimmedDoc.length > FIELD_LIMITS.DOCUMENT_MAX_LENGTH) {
        newErrors[`person_${index}_doc`] = `El documento excede el límite de ${FIELD_LIMITS.DOCUMENT_MAX_LENGTH} caracteres.`;
        newErrorList.push({ field: `Persona ${index + 1}`, message: 'Documento demasiado largo' });
      } else if (!/^\d+$/.test(trimmedDoc)) {
        newErrors[`person_${index}_doc`] = 'El documento solo puede contener números.';
        newErrorList.push({ field: `Persona ${index + 1}`, message: 'El documento debe contener solo números' });
      }
    });

    if (!selectedDate || !selectedTime) {
      newErrorList.push({ field: 'Fecha y Hora', message: 'Debes seleccionar una fecha y horario de llegada válido' });
    }

    if (newErrorList.length > 0) {
      setErrors(newErrors);
      setErrorList(newErrorList);
      return;
    }

    setErrors({});
    setErrorList([]);
    setIsSubmitting(true);

    try {
      await new Promise(r => setTimeout(r, 300));
      const expectedAtStr = `${selectedDate}T${selectedTime}:00-05:00`;

      if (editingVisitor) {
        await updateVisitor(editingVisitor.id, {
          name: normalizeWhitespace(persons[0].name),
          documentId: persons[0].documentId.trim(),
          vehiclePlate: persons[0].vehiclePlate ? persons[0].vehiclePlate.trim().toUpperCase() : '',
          expectedAt: expectedAtStr,
          observations: normalizeWhitespace(observations),
          visitPurpose: normalizeWhitespace(visitPurpose),
        });
        notificationService.showToast('Visita actualizada correctamente', 'success');
        setIsModalOpen(false);
      } else {
        const normalizedPersons = persons.map(p => ({
          name: normalizeWhitespace(p.name),
          documentId: p.documentId.trim(),
          vehiclePlate: p.vehiclePlate ? p.vehiclePlate.trim().toUpperCase() : '',
        }));

        const createdVisitors = await createGroupVisit(
          {
            propertyId: myPropertyId,
            expectedAt: expectedAtStr,
            observations: normalizeWhitespace(observations),
            visitPurpose: normalizeWhitespace(visitPurpose),
            groupName: persons.length > 1 ? `${visitPurpose} (${persons.length} personas)` : undefined,
          },
          normalizedPersons
        );

        notificationService.showToast(
          persons.length > 1 
            ? `Pase unificado generado para ${persons.length} personas` 
            : 'Pase de visita generado con éxito', 
            'success'
        );
        setIsModalOpen(false);
        setShowQRGroup(createdVisitors);
      }
    } catch {
      notificationService.showError('Error al guardar', 'No fue posible autorizar la visita.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    const confirmed = await notificationService.showConfirm(
      '¿Cancelar visita?',
      `¿Deseas cancelar la visita de ${name}? El pase QR quedará inválido.`,
      'Sí, cancelar',
      'Mantener'
    );
    if (confirmed) {
      try {
        await deleteVisitor(id);
        notificationService.showToast(`Visita de ${name} cancelada exitosamente`, 'success');
        if (showQRGroup) {
          setShowQRGroup(prev => prev ? prev.map(v => v.id === id ? { ...v, status: 'CANCELLED' as const } : v) : null);
        }
      } catch (err: any) {
        const msg = err?.message || 'No se pudo cancelar la visita. Intenta de nuevo.';
        notificationService.showToast(msg, 'error');
      }
    }
  };

  const copyQRLink = (token: string) => {
    const localPassUrl = `${window.location.origin}/pass/${token}`;
    navigator.clipboard.writeText(localPassUrl);
    setCopiedLink(true);
    notificationService.showToast('Enlace de acceso local copiado al portapapeles', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Visitas Pre-autorizadas</h2>
            <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full">
              {activePropertyName}
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Pre-autoriza visitas individuales o familiares con un solo código QR para agilizar el ingreso en portería.
          </p>
        </div>
        
        <Button onClick={handleOpenCreate} className="bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-sm h-11 px-5">
          <UserPlus className="w-4 h-4 mr-2" /> Pre-Autorizar Visita
        </Button>
      </div>

      {/* Visits List Grouped */}
      <div className="space-y-4">
        {currentGroups.map((group) => {
          const first = group[0];
          const isGroup = group.length > 1;
          const allEntered = group.every(v => v.status === 'ENTERED' || v.status === 'EXITED');
          const allExited = group.every(v => v.status === 'EXITED');
          const allExpired = group.every(v => v.status === 'EXPIRED');
          const hasActivity = group.some(v => v.status === 'ENTERED' || v.status === 'EXITED');

          return (
            <Card key={first.groupId || first.id} className="p-5 rounded-3xl border border-slate-200/80 shadow-xs bg-white space-y-4 transition-all hover:border-slate-300">
              {/* Card Header: Visit Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[var(--tenant-primary)] flex items-center justify-center font-bold text-xs shrink-0">
                    {isGroup ? <Users className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                      {first.visitPurpose || (isGroup ? `Visita Grupal (${group.length} personas)` : first.name)}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {first.expectedAt || 'Hoy'}
                      </span>
                      <span>•</span>
                      <span>{group.length} {group.length === 1 ? 'persona autorizada' : 'personas autorizadas'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    allExited ? 'bg-slate-100 text-slate-600' :
                    allEntered ? 'bg-emerald-100 text-emerald-800' :
                    allExpired ? 'bg-slate-50 text-slate-500 border border-slate-200' :
                    first.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                    first.status === 'EXITED' ? 'bg-rose-100 text-rose-800' :
                    first.status === 'EXPIRED' ? 'bg-slate-50 text-slate-500 border border-slate-200' :
                    first.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {first.status === 'ENTERED' ? 'En curso' : first.status === 'APPROVED' ? 'Pre-autorizada' : first.status === 'EXITED' ? 'Finalizada' : first.status === 'EXPIRED' ? 'Expirada' : first.status === 'CANCELLED' ? 'Cancelada' : 'Pendiente'}
                  </span>

                  <button
                    onClick={() => setShowQRGroup(group)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[var(--tenant-primary)] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" /> Ver Pase QR
                  </button>

                  <button
                    onClick={() => handleRepeatVisit(group)}
                    title="Repetir esta visita para hoy"
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Members List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {group.map((vis) => (
                  <div key={vis.id} className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate">{vis.name}</span>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${vis.status === 'ENTERED' ? 'bg-emerald-500' : vis.status === 'EXITED' ? 'bg-slate-400' : 'bg-blue-500'}`} />
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>Doc: {vis.documentId}</span>
                        {vis.vehiclePlate && (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200">
                            <Car className="w-2.5 h-2.5" />
                            {vis.vehiclePlate}
                          </span>
                        )}
                        {vis.status === 'EXITED' && vis.exitedAt ? (
                          <span className="text-slate-500 font-medium">(Salió: {formatFriendlyDateTime(vis.exitedAt)})</span>
                        ) : vis.status === 'ENTERED' && vis.enteredAt ? (
                          <span className="text-emerald-700 font-medium">(Entró: {formatFriendlyDateTime(vis.enteredAt)})</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {(vis.status === 'APPROVED' || vis.status === 'PENDING') && (
                        <button
                          onClick={() => handleOpenEditSingle(vis)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
                          title="Editar persona"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(vis.status === 'APPROVED' || vis.status === 'PENDING') && (
                        <button
                          onClick={() => handleDeleteMember(vis.id, vis.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                          title="Cancelar visita"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {first.observations && (
                <p className="text-xs text-slate-500 italic bg-slate-50/50 p-2.5 rounded-xl">
                  Observaciones: "{first.observations}"
                </p>
              )}
            </Card>
          );
        })}

        {visitGroups.length === 0 && (
          <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs space-y-3">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-300" />
            <div>
              <p className="font-bold text-slate-700 text-sm">No tienes visitas programadas</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Pre-autoriza la llegada de tus amigos, familiares o domicilios para que ingresen rápidamente con su código QR.
              </p>
            </div>
            <Button onClick={handleOpenCreate} className="bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-2xl text-xs font-bold px-4 py-2">
              <UserPlus className="w-4 h-4 mr-1.5" /> Pre-Autorizar Primera Visita
            </Button>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">
              Mostrando {(validCurrentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(validCurrentPage * ITEMS_PER_PAGE, visitGroups.length)} de {visitGroups.length} visitas
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

      {/* Unified QR Modal for Group or Individual */}
      {showQRGroup && showQRGroup.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onKeyDown={(e) => { if (e.key === 'Escape') setShowQRGroup(null); }}
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--tenant-primary)] bg-blue-50 px-2.5 py-1 rounded-full">
                {showQRGroup.length > 1 ? `Pase Grupal · ${showQRGroup.length} Personas` : 'Pase Individual'}
              </span>
              <button onClick={() => setShowQRGroup(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                {showQRGroup[0]?.visitPurpose || (showQRGroup.length > 1 ? 'Pase de Visita Grupal' : showQRGroup[0]?.name)}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Destino: <strong className="text-slate-800">
                    {(userProperties?.find(p => p.propertyId === showQRGroup[0]?.propertyId) as any)?.path || userProperties?.find(p => p.propertyId === showQRGroup[0]?.propertyId)?.name || user?.propertyUnit || showQRGroup[0]?.propertyId}
                  </strong> • {showQRGroup[0]?.expectedAt || 'Hoy'}
              </p>
            </div>

            {/* Visual Simulated QR */}
              <div className="p-4 pb-3 bg-slate-50 rounded-[24px] border border-slate-200 inline-flex flex-col items-center justify-center shadow-inner gap-3">
                <div className="w-40 h-40 bg-white p-2 border border-slate-200 rounded-2xl flex items-center justify-center relative overflow-hidden">
                  <QRCodeSVG 
                    value={showQRGroup[0]?.qrCode || showQRGroup[0]?.id || ''} 
                    size={140} 
                    level="H"
                    className="w-full h-full opacity-90"
                    bgColor="#ffffff"
                    fgColor="#1e293b" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>
                </div>
                
                {/* Short Code Display */}
                <div className="text-[11px] font-mono font-bold tracking-[0.2em] text-slate-500">
                  {showQRGroup[0]?.qrCode || ('QR-' + showQRGroup[0]?.id?.split('-')[0]?.toUpperCase()) || 'QR-N/A'}
                </div>
              </div>

            {/* Authorized Guests Summary in QR */}
            <div className="text-left bg-slate-50 p-3 rounded-2xl border border-slate-100 max-h-36 overflow-y-auto space-y-1.5 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Personas autorizadas en este pase:
              </div>
              {showQRGroup.map((v) => (
                <div key={v.id} className="flex items-center justify-between text-slate-700">
                  <span className="font-semibold truncate">{v.name}</span>
                  <span className="text-slate-400 font-mono text-[11px]">DOC {}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <a
                href={`/pass/${showQRGroup[0]?.qrCode || showQRGroup[0]?.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold shadow-2xs flex items-center justify-center gap-2 h-10 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-slate-500" />
                Abrir Pase Mock en Nueva Pestaña
              </a>

              <Button
                onClick={() => copyQRLink(showQRGroup[0]?.qrCode || showQRGroup[0]?.id)}
                className="w-full bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-2xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 h-11"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? 'Enlace Copiado' : 'Copiar Enlace Local'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Redesigned Modal: Nueva Visita (Single / Multiple Persons with Smart Defaults) */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isSubmitting) setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header (Sticky / Fixed at top of modal) */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-white">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  {editingVisitor ? 'Editar Visita' : 'Pre-Autorizar Visita'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Los datos generales aplican a toda la visita. Puedes agregar a todas las personas que ingresarán.
                </p>
              </div>
              <button 
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1">
              <FormErrorSummary errors={errorList} />

              <form id="visitor-form" onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Visit Global Details (Requested once only) */}
                <div className="bg-slate-50/90 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    1. Datos Generales de la Visita
                  </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="res-vis-purpose" className="block text-xs font-semibold text-slate-700">Motivo / Título de la visita</label>
                    <CharacterCounter current={visitPurpose.length} max={FIELD_LIMITS.TITLE_MAX_LENGTH} />
                  </div>
                  <input
                    id="res-vis-purpose"
                    type="text"
                    maxLength={FIELD_LIMITS.TITLE_MAX_LENGTH}
                    value={visitPurpose}
                    onChange={(e) => setVisitPurpose(e.target.value)}
                    placeholder="Ej. Visita familiar, Almuerzo de amigos, Celebración..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* New DateTimeAvailabilityPicker */}
                <div className="pt-2 border-t border-slate-200/60">
                  <DateTimeAvailabilityPicker
                    selectedDate={selectedDate}
                    visitorSettings={visitorSettings}
                    selectedTime={selectedTime}
                    onDateChange={setSelectedDate}
                    onTimeChange={setSelectedTime}
                    onAutoSwitch={(msg) => notificationService.showToast(msg, 'info')}
                  />
                </div>
              </div>

              {/* Frequent Guest Quick-Add Chips */}
              {!editingVisitor && frequentGuests.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-semibold">Sugerencias / Invitados Frecuentes:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {frequentGuests.map((guest) => (
                      <button
                        key={guest.documentId}
                        type="button"
                        onClick={() => handleSelectFrequentGuest(guest)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-blue-50/70 text-blue-700 hover:bg-blue-100 border border-blue-100 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        {guest.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Persons Section (Dynamic list with zero friction) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    2. Personas que ingresarán ({persons.length})
                  </span>
                  {!editingVisitor && (
                    <button
                      type="button"
                      onClick={handleAddPerson}
                      className="text-xs font-bold text-[var(--tenant-primary)] flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar otra persona
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {persons.map((person, index) => (
                    <div key={person.id} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Persona {index + 1}</span>
                        {persons.length > 1 && !editingVisitor && (
                          <button
                            type="button"
                            onClick={() => handleRemovePerson(person.id)}
                            className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <input
                            type="text"
                            maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                            value={person.name}
                            onChange={(e) => handlePersonChange(person.id, 'name', e.target.value)}
                            placeholder="Nombre completo *"
                            aria-label={`Nombre completo persona ${index + 1}`}
                            className={`w-full px-3 py-2 text-xs rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 ${
                              errors[`person_${index}_name`] ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'
                            }`}
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            maxLength={FIELD_LIMITS.DOCUMENT_MAX_LENGTH}
                            value={person.documentId}
                            onChange={(e) => handlePersonChange(person.id, 'documentId', formatDocumentInput(e.target.value))}
                            placeholder="Documento / C.C. *"
                            aria-label={`Documento persona ${index + 1}`}
                            className={`w-full px-3 py-2 text-xs rounded-xl border bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 ${
                              errors[`person_${index}_doc`] ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'
                            }`}
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            maxLength={FIELD_LIMITS.VEHICLE_PLATE_MAX_LENGTH}
                            value={person.vehiclePlate || ''}
                            onChange={(e) => handlePersonChange(person.id, 'vehiclePlate', formatPlateInput(e.target.value))}
                            placeholder="Placa vehículo (Ej. ABC123)"
                            aria-label={`Placa vehículo persona ${index + 1}`}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Observations */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="res-vis-obs" className="block text-xs font-semibold text-slate-700">Observaciones para portería</label>
                  <CharacterCounter current={observations.length} max={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH} />
                </div>
                <input
                  id="res-vis-obs"
                  type="text"
                  maxLength={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Ej. Llegan en taxi, autorizo uso de parqueadero comunal si hay cupo."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </form>
          </div>

          {/* Sticky Actions Footer (always visible at bottom of modal) */}
          <div className="flex items-center justify-end gap-2 p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="rounded-2xl h-11 px-5"
            >
              Cancelar
            </Button>
            <SubmitButton
              form="visitor-form"
              isSubmitting={isSubmitting}
              loadingText="Generando Pase..."
              className="rounded-2xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-bold h-11 px-6 shadow-sm"
            >
              {editingVisitor ? 'Guardar Cambios' : persons.length > 1 ? `Generar Pase para ${persons.length} Personas` : 'Generar Pase de Acceso'}
            </SubmitButton>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};





