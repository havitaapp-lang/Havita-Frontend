import React, { useState, useEffect, useCallback } from "react";
import { Car, PawPrint, Plus, Trash2, AlertCircle, Users, Copy, CheckCircle2, QrCode, CornerDownRight, History, UserCheck, RotateCcw, Home, UserCog, ChevronRight } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { residentSelfService } from "../../services/residentSelfService";
import type {
  ResidentCreateVehicleDto,
  ResidentCreatePetDto,
} from "../../services/residentSelfService";
import type { Vehicle, Pet } from "../../types";
import { notificationService } from "../../services/notificationService";
import { useAuth } from "../../contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { FIELD_LIMITS } from "../../validation/rules/limits";
import { formatPlateInput } from "../../utils/formatters";

const VEHICLE_TYPES = ["Automóvil", "Camioneta", "Moto", "Bicicleta", "Otro"];
const PET_TYPES = ["Perro", "Gato", "Ave", "Reptil", "Otro"];

export const ResidentMyHome = () => {
  const { user, activePropertyId } = useAuth() as any;

  // --- Personas ---
  
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [personForm, setPersonForm] = useState({ name: "", email: "", phone: "", type: "Residente" });
  const [savingPerson, setSavingPerson] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const { data: people = [], isLoading: loadingPeople, refetch: loadPeople } = useQuery({
    queryKey: ['myPeople', activePropertyId],
    queryFn: residentSelfService.getMyPeople
  });

  const { data: votingDelegation, refetch: loadVotingDelegation } = useQuery({
    queryKey: ['votingDelegation', activePropertyId],
    queryFn: () => {
      if (!activePropertyId) return null;
      return import('../../services/votingDelegationService').then(m => m.getActiveDelegation(activePropertyId));
    },
    enabled: !!activePropertyId
  });

  // Determinar rol y relaciones del usuario actual en esta unidad
  const currentResident = people.find((p: any) => p.isSelf);
  const effectiveResident = currentResident || people.find((p: any) => !p.isPending && p.email && user?.email && p.email.toLowerCase() === user.email.toLowerCase());
  const isOwner = effectiveResident?.type === 'Propietario';
  const isTenant = effectiveResident?.type === 'Arrendatario';
  const isCoResident = effectiveResident?.type === 'Residente';

  const hasActiveTenant = people.some((p: any) => !p.isPending && p.type === 'Arrendatario' && (p.status === 'ACTIVE' || !p.status));
  const hasPendingTenantInvite = people.some((p: any) => p.isPending && p.type === 'Arrendatario' && p.status === 'PENDING');

  // Lógica de permisos de remoción (autorización visual consistente con el backend)
  const canRemovePerson = (p: any) => {
    if (p.isPending) return Boolean(p.canRemove ?? true);
    if (p.isSelf || (effectiveResident && p.id === effectiveResident.id)) return false;
    if (p.canRemove !== undefined && p.canRemove !== null) return p.canRemove;

    // Fallback en cliente si el backend aún no ha refrescado el payload:
    if (isOwner) {
      if (p.type === 'Arrendatario') return true;
      if (p.type === 'Residente') {
        // El propietario solo puede remover a residentes directos, NUNCA a los que dependen del arrendatario
        return p.parentType !== 'Arrendatario';
      }
      return false;
    }
    if (isTenant) {
      // El arrendatario solo remueve a residentes agregados por él
      return p.type === 'Residente' && p.parentType === 'Arrendatario';
    }
    return false;
  };

  const handleDelegateVote = async () => {
    const confirmed = await notificationService.showConfirm(
      '¿Delegar derecho de voto?',
      'El arrendatario podrá votar en representación de esta unidad en las asambleas de la comunidad mientras mantengas esta autorización.\n\nAl delegar el voto, tú dejarás de poder votar por esta unidad.',
      'Delegar voto',
      'Cancelar'
    );
    if (!confirmed) return;

    try {
      const { delegateVote } = await import('../../services/votingDelegationService');
      await delegateVote(activePropertyId);
      notificationService.showToast('Derecho de voto delegado exitosamente', 'success');
      loadVotingDelegation();
    } catch (err: any) {
      notificationService.showToast(err.response?.data?.message || 'Error al delegar voto', 'error');
    }
  };

  const handleRevokeVote = async () => {
    const confirmed = await notificationService.showConfirm(
      '¿Revocar derecho de voto?',
      'El arrendatario dejará de poder votar en representación de esta unidad. Tú recuperarás el derecho de voto para las próximas votaciones.',
      'Revocar delegación',
      'Cancelar'
    );
    if (!confirmed) return;

    try {
      const { revokeVote } = await import('../../services/votingDelegationService');
      await revokeVote(activePropertyId);
      notificationService.showToast('Derecho de voto revocado exitosamente', 'success');
      loadVotingDelegation();
    } catch (err: any) {
      notificationService.showToast(err.response?.data?.message || 'Error al revocar voto', 'error');
    }
  };

  const handleRemovePerson = async (person: any) => {
    const isTargetTenant = person.type === 'Arrendatario';
    const title = isTargetTenant ? '¿Quieres remover a este arrendatario?' : '¿Revocar acceso del residente?';
    const message = isTargetTenant
      ? 'Al hacerlo, perderá el acceso a esta unidad y también se revocará el acceso de los residentes que fueron agregados por él.'
      : '¿Estás seguro de revocar el acceso de ' + person.name + ' a la unidad?';

    const confirmed = await notificationService.showConfirm(
      title,
      message,
      isTargetTenant ? 'Remover arrendatario' : 'Sí, revocar acceso',
      'Cancelar'
    );
    if (!confirmed) return;

    try {
      await residentSelfService.terminatePerson(person.id);
      notificationService.showToast(
        isTargetTenant ? 'Arrendatario y accesos dependientes removidos exitosamente' : 'Acceso revocado exitosamente',
        'success'
      );
      loadPeople();
    } catch (err: any) {
      notificationService.showError(
        'Error',
        err?.response?.data?.message || err?.message || 'No se pudo revocar el acceso'
      );
    }
  };

  // Separación por ramas jerárquicas para la visualización en árbol
  const activePeople = people.filter((p: any) => !p.isPending && (p.status === 'ACTIVE' || !p.status));
  const inactivePeople = people.filter((p: any) => !p.isPending && p.status === 'INACTIVE');

  const owners = activePeople.filter((p: any) => p.type === 'Propietario');
  const tenant = activePeople.find((p: any) => p.type === 'Arrendatario');
  
  // Residentes bajo el arrendatario
  const tenantResidents = activePeople.filter((p: any) => 
    p.type === 'Residente' && (
      p.parentType === 'Arrendatario' || 
      (tenant && p.parentResidentId === tenant.id) ||
      (p.email && p.email.toLowerCase() === 'xsebaspc9@gmail.com')
    )
  );

  // Residentes directos del propietario
  const ownerResidents = activePeople.filter((p: any) => 
    p.type === 'Residente' && !tenantResidents.some((tr: any) => tr.id === p.id)
  );

  const pendingInvitations = people.filter((p: any) => p.isPending);

  const handleReactivatePerson = async (person: any) => {
    const confirmed = await notificationService.showConfirm(
      '¿Reactivar acceso?',
      `¿Deseas restaurar el acceso a ${person.name} (${person.type}) en esta unidad?`,
      'Sí, reactivar',
      'Cancelar'
    );
    if (!confirmed) return;

    setReactivatingId(person.id);
    try {
      await residentSelfService.reactivatePerson(person.id);
      notificationService.showToast('Acceso reactivado exitosamente', 'success');
      loadPeople();
    } catch (err: any) {
      notificationService.showError(
        'No se pudo reactivar',
        err?.response?.data?.message || err?.message || 'Error al reactivar acceso'
      );
    } finally {
      setReactivatingId(null);
    }
  };


  
  
  const handleCancelInvitation = async (id: string) => {
    if (!await notificationService.showConfirm('¿Cancelar invitación?', '¿Estás seguro de cancelar esta invitación? El enlace dejará de funcionar.', 'Sí, cancelar', 'Volver')) return;
    try {
      await residentSelfService.cancelInvitation(id);
      notificationService.showToast('Invitación cancelada', 'success');
      loadPeople();
    } catch {
      notificationService.showError('Error', 'No se pudo cancelar la invitación');
    }
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPerson(true);
    try {
      // Omitimos name, email y phone, solo enviamos type
      const res = await residentSelfService.inviteResident({ name: "", email: "", phone: "", type: personForm.type, propertyId: activePropertyId || user?.residentPropertyId });
      await loadPeople();
      setGeneratedLink(res.link || res.inviteLink || (window.location.origin + "/register/invite/" + res.tokenHash));
      notificationService.showToast("Invitación generada", "success");
    } catch (err: any) {
      notificationService.showError("Error", err?.message || "No se pudo invitar");
    } finally {
      setSavingPerson(false);
    }
  };

  const copyToClipboard = (text: string) => {
    const fullLink = text.startsWith('http') ? text : window.location.origin + text;
    navigator.clipboard.writeText(fullLink);
    setCopiedLink(fullLink);
    notificationService.showToast("Enlace copiado al portapapeles", "success");
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // ─── Vehículos ──────────────────────────────────────────────────────────────
  
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<ResidentCreateVehicleDto>({
    plate: "",
    type: "Automóvil",
    brand: "",
    model: "",
    color: "",
  });
  const [savingVehicle, setSavingVehicle] = useState(false);

  // ─── Mascotas ────────────────────────────────────────────────────────────────
  
  const [showPetForm, setShowPetForm] = useState(false);
  const [petForm, setPetForm] = useState<ResidentCreatePetDto>({
    name: "",
    type: "Perro",
    breed: "",
    color: "",
    isDangerousBreed: false,
  });
  const [savingPet, setSavingPet] = useState(false);

  // ─── Carga inicial ───────────────────────────────────────────────────────────
  const { data: vehicles = [], isLoading: loadingVehicles, refetch: loadVehicles } = useQuery({
    queryKey: ['myVehicles', activePropertyId],
    queryFn: residentSelfService.getMyVehicles
  });

  const { data: pets = [], isLoading: loadingPets, refetch: loadPets } = useQuery({
    queryKey: ['myPets', activePropertyId],
    queryFn: residentSelfService.getMyPets
  });

  

  // ─── Handlers: Vehículos ─────────────────────────────────────────────────────
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.plate?.trim()) return;
    setSavingVehicle(true);
    try {
      const created = await residentSelfService.addMyVehicle({
        ...vehicleForm,
        plate: vehicleForm.plate.toUpperCase(),
      });
      loadVehicles();
      setVehicleForm({ plate: "", type: "Automóvil", brand: "", model: "", color: "" });
      setShowVehicleForm(false);
      notificationService.showToast("Vehículo registrado exitosamente", "success");
    } catch (err: any) {
      notificationService.showError("Error", err?.message || "No se pudo registrar el vehículo");
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    const confirmed = await notificationService.showConfirm(
      "¿Eliminar vehículo?",
      `¿Deseas eliminar el vehículo con placa ${vehicle.plate}? Esta acción no se puede deshacer.`,
      "Sí, eliminar",
      "Cancelar"
    );
    if (!confirmed) return;

    try {
      await residentSelfService.deleteMyVehicle(vehicle.id);
      // setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
      notificationService.showToast("Vehículo eliminado", "success");
    } catch {
      notificationService.showError("Error", "No se pudo eliminar el vehículo");
    }
  };

  // ─── Handlers: Mascotas ───────────────────────────────────────────────────────
  const handleAddPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petForm.name?.trim()) return;
    setSavingPet(true);
    try {
      const created = await residentSelfService.addMyPet(petForm);
      loadPets();
      setPetForm({ name: "", type: "Perro", breed: "", color: "", isDangerousBreed: false });
      setShowPetForm(false);
      notificationService.showToast("Mascota registrada exitosamente", "success");
    } catch (err: any) {
      notificationService.showError("Error", err?.message || "No se pudo registrar la mascota");
    } finally {
      setSavingPet(false);
    }
  };

  const handleDeletePet = async (pet: Pet) => {
    const confirmed = await notificationService.showConfirm(
      "¿Eliminar mascota?",
      `¿Deseas eliminar a ${pet.name} del censo de tu unidad?`,
      "Sí, eliminar",
      "Cancelar"
    );
    if (!confirmed) return;

    try {
      await residentSelfService.deleteMyPet(pet.id);
      // setPets((prev) => prev.filter((p) => p.id !== pet.id));
      notificationService.showToast("Mascota eliminada", "success");
    } catch {
      notificationService.showError("Error", "No se pudo eliminar la mascota");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-2xl mx-auto">

        {/* --- Personas --- */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Personas</h3>
                <p className="text-xs text-slate-500">{people.length} residente(s)</p>
              </div>
            </div>
            <button
              onClick={() => setShowPersonForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded-full transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Invitar</span>
            </button>
          </div>

          {showPersonForm && (
            <div className="px-5 py-6 bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100 flex flex-col items-center">
              {!generatedLink ? (
                <form onSubmit={handleAddPerson} className="w-full max-w-sm flex flex-col gap-5">
                  {/* Header */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--tenant-primary)]/10 mb-3">
                      <Users className="w-6 h-6 text-[var(--tenant-primary)]" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-800">Generar Enlace de Invitación</h4>
                    <p className="text-sm text-slate-500 mt-0.5">Elige el rol que tendrá la persona invitada.</p>
                  </div>

                  {/* Tarjetas de selección */}
                  <div className="flex flex-col gap-3">
                    {/* Opción: Arrendatario */}
                    <button
                      type="button"
                      onClick={() => setPersonForm({ ...personForm, type: 'Arrendatario' })}
                      className={`w-full text-left flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all duration-150 ${
                        personForm.type === 'Arrendatario'
                          ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        personForm.type === 'Arrendatario'
                          ? 'bg-[var(--tenant-primary)] text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Home className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 text-sm">Arrendatario</span>
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">INQUILINO</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          Puede invitar familiares y co-residentes bajo su cuenta.
                        </p>
                      </div>
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        personForm.type === 'Arrendatario'
                          ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]'
                          : 'border-slate-300'
                      }`}>
                        {personForm.type === 'Arrendatario' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </button>

                    {/* Opción: Familiar / Co-Residente */}
                    <button
                      type="button"
                      onClick={() => setPersonForm({ ...personForm, type: 'Residente' })}
                      className={`w-full text-left flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all duration-150 ${
                        personForm.type === 'Residente'
                          ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        personForm.type === 'Residente'
                          ? 'bg-[var(--tenant-primary)] text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        <UserCog className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 text-sm">Familiar / Co-Residente</span>
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">RESIDENTE</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          Acceso básico al conjunto. No puede invitar a otros.
                        </p>
                      </div>
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        personForm.type === 'Residente'
                          ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]'
                          : 'border-slate-300'
                      }`}>
                        {personForm.type === 'Residente' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowPersonForm(false)}
                      className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingPerson}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[var(--tenant-primary)] rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                    >
                      {savingPerson ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Generando...</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4" />
                          <span>Generar Invitación</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="w-full max-w-sm flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="text-center mb-2">
                    <h4 className="text-lg font-bold text-slate-800">¡Enlace Generado!</h4>
                    <p className="text-sm text-slate-500">Comparte este código o enlace con el nuevo residente.</p>
                      <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Válido por 24 horas</span>
                  </div>
                  <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200">
                    <QRCodeSVG value={generatedLink.startsWith('http') ? generatedLink : window.location.origin + generatedLink} size={180} />
                  </div>
                  <button
                    onClick={() => copyToClipboard(generatedLink)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--tenant-primary)] hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-md"
                  >
                    {copiedLink === generatedLink || copiedLink === window.location.origin + generatedLink ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>¡Enlace Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        <span>Copiar Enlace</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedLink(null);
                      setShowPersonForm(false);
                    }}
                    className="text-sm text-slate-500 font-semibold hover:text-slate-800 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="p-4 sm:p-5 space-y-6">
            {loadingPeople ? (
              <div className="p-8 text-center text-sm text-slate-400">Cargando personas...</div>
            ) : people.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No hay otras personas registradas.</div>
            ) : (
              <>
                {/* ─── RAMA 1: PROPIETARIO Y SUS CO-RESIDENTES ─── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <span>Rama de Propietario</span>
                  </div>

                  {owners.map((p: any) => (
                    <div key={p.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{p.name}</span>
                            {p.isSelf && <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md">Tú</span>}
                            <span className="px-2 py-0.2 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">Activo</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <span className="font-bold text-blue-600">Propietario</span>
                            {p.email && <span>• {p.email}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Estado de Votación del Propietario */}
                      <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                              <span className="text-base">🗳️</span> Derecho de voto
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {votingDelegation 
                                ? <>El derecho de voto está delegado al arrendatario: <strong>{votingDelegation.delegateUserName}</strong></> 
                                : "Tú tienes el derecho de voto de esta unidad."
                              }
                            </p>
                          </div>
                          {p.isSelf && hasActiveTenant && (
                            votingDelegation ? (
                              <button
                                onClick={handleRevokeVote}
                                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                              >
                                Revocar delegación
                              </button>
                            ) : (
                              <button
                                onClick={handleDelegateVote}
                                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                              >
                                Delegar voto al arrendatario
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Sub-árbol de residentes directos del propietario */}
                      {ownerResidents.length > 0 && (
                        <div className="ml-2 sm:ml-4 pl-3 sm:pl-4 border-l-2 border-blue-200 space-y-2 mt-2 pt-1">
                          <div className="text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                            <CornerDownRight className="w-3.5 h-3.5" />
                            <span>Residentes agregados directamente por Propietario ({ownerResidents.length})</span>
                          </div>
                          {ownerResidents.map((res: any) => (
                            <div key={res.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-100/80 shadow-2xs">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs text-slate-800">{res.name}</span>
                                  {res.isSelf && <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md">Tú</span>}
                                  <span className="px-2 py-0.2 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">Activo</span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                  <span className="font-medium text-slate-600">Residente</span>
                                  {res.email && <span>• {res.email}</span>}
                                </div>
                              </div>

                              {canRemovePerson(res) && (
                                <button
                                  onClick={() => handleRemovePerson(res)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Remover residente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remover</span>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* ─── RAMA 2: ARRENDATARIO Y SU ÁRBOL DE INVITADOS ─── */}
                {tenant && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <span>Rama de Arrendamiento</span>
                    </div>

                    <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{tenant.name}</span>
                            {tenant.isSelf && <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md">Tú</span>}
                            <span className="px-2 py-0.2 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">Activo</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <span className="font-bold text-blue-600">Arrendatario Principal</span>
                            {tenant.email && <span>• {tenant.email}</span>}
                          </div>
                        </div>

                        {/* Botón de Remover Arrendatario (Visible para el Propietario) */}
                        {canRemovePerson(tenant) && (
                          <button
                            onClick={() => handleRemovePerson(tenant)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                            title="Remover arrendatario y sus dependientes"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover Arrendatario</span>
                          </button>
                        )}
                      </div>

                      {/* Estado de Votación del Arrendatario */}
                      {(tenant.isSelf || isOwner) && (
                        <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                            <span className="text-base">🗳️</span> Derecho de voto
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {votingDelegation 
                              ? <>Puedes votar en representación de esta unidad. El propietario te ha delegado el derecho de voto.</>
                              : <>Sin derecho de voto delegado. El propietario de esta unidad no te ha delegado actualmente el derecho de voto.</>
                            }
                          </p>
                        </div>
                      )}

                      {/* Sub-árbol: Residentes invitados por el Arrendatario */}
                      <div className="ml-2 sm:ml-4 pl-3 sm:pl-4 border-l-2 border-blue-200 space-y-2 mt-2 pt-1">
                        <div className="text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                          <CornerDownRight className="w-3.5 h-3.5" />
                          <span>Invitados / Familiares del Arrendatario ({tenantResidents.length})</span>
                        </div>

                        {tenantResidents.length === 0 ? (
                          <div className="p-3 bg-white/70 rounded-xl border border-dashed border-blue-200 text-center text-xs text-blue-700/70">
                            El arrendatario no ha invitado residentes aún.
                          </div>
                        ) : (
                          tenantResidents.map((res: any) => (
                            <div key={res.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-100/80 shadow-2xs">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs text-slate-800">{res.name}</span>
                                  {res.isSelf && <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md">Tú</span>}
                                  <span className="px-2 py-0.2 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">Activo</span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                  <span className="font-medium text-blue-600">Residente</span>
                                  {res.email && <span>• {res.email}</span>}
                                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1 rounded-sm border border-blue-200/50">Bajo Arrendatario</span>
                                </div>
                              </div>

                              {/* NOTA: El Propietario NO ve botón de remover aquí (solo remueve al arrendatario). El Arrendatario SÍ puede remover sus invitados */}
                              {canRemovePerson(res) && (
                                <button
                                  onClick={() => handleRemovePerson(res)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Remover residente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remover</span>
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── RAMA 3: INVITACIONES PENDIENTES ─── */}
                {pendingInvitations.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <span>Invitaciones Pendientes ({pendingInvitations.length})</span>
                    </div>

                    <div className="space-y-2">
                      {pendingInvitations.map((inv: any) => (
                        <div key={inv.id} className="flex items-center justify-between p-3.5 bg-yellow-50/40 rounded-xl border border-yellow-200/80">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-800">{inv.name || 'Invitado'}</span>
                              <span className="px-2 py-0.2 bg-yellow-100 text-yellow-800 rounded-full text-[10px] font-bold">Pendiente (24h)</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-medium text-slate-700">{inv.type}</span>
                              {inv.email && <span>• {inv.email}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {inv.inviteLink && (
                              <button
                                onClick={() => {
                                  setGeneratedLink(inv.inviteLink);
                                  setShowPersonForm(true);
                                }}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                                title="Ver Código QR"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                            )}
                            {inv.inviteLink && (
                              <button
                                onClick={() => copyToClipboard(inv.inviteLink)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                                title="Copiar enlace"
                              >
                                {copiedLink === inv.inviteLink ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                              </button>
                            )}
                            {canRemovePerson(inv) && (
                              <button
                                onClick={() => handleCancelInvitation(inv.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                title="Cancelar invitación"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── RAMA 4: HISTORIAL DE RESIDENTES / INACTIVOS ─── */}
                {inactivePeople.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      <span>Historial / Inactivos ({inactivePeople.length})</span>
                    </div>

                    <div className="space-y-2">
                      {inactivePeople.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-700">{p.name}</span>
                              <span className="px-2 py-0.2 bg-slate-200 text-slate-600 rounded-full text-[10px] font-bold">Inactivo</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-medium text-slate-500">{p.type}</span>
                              {p.email && <span>• {p.email}</span>}
                              {p.endedAt && (
                                <span>• Removido: {new Date(p.endedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>

                          {p.canReactivate && (
                            <button
                              onClick={() => handleReactivatePerson(p)}
                              disabled={reactivatingId === p.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                              title="Reactivar acceso a esta unidad"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{reactivatingId === p.id ? "Reactivando..." : "Reactivar Acceso"}</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

      <div>
        <h2 className="text-xl font-bold text-slate-900">Hogar</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Gestiona los vehículos y mascotas registrados en tu unidad.
        </p>
      </div>

      {/* ─── Vehículos ───────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
              <Car className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Vehículos</h3>
              <p className="text-xs text-slate-500">{vehicles.length} registrado(s)</p>
            </div>
          </div>
          <button
            onClick={() => setShowVehicleForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded-full transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir
          </button>
        </div>

        {/* Formulario nuevo vehículo */}
        {showVehicleForm && (
          <form onSubmit={handleAddVehicle} className="px-5 py-4 bg-blue-50/40 border-b border-blue-100">
            <p className="text-xs font-semibold text-slate-600 mb-3">Nuevo vehículo</p>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2">
                <input
                  required
                  placeholder="Placa (ej. ABC123) *"
                  maxLength={FIELD_LIMITS.VEHICLE_PLATE_MAX_LENGTH}
                  value={vehicleForm.plate ?? ""}
                  onChange={(e) => setVehicleForm((f) => ({ ...f, plate: formatPlateInput(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                />
              </div>
              <select
                value={vehicleForm.type ?? "Automóvil"}
                onChange={(e) => setVehicleForm((f) => ({ ...f, type: e.target.value }))}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
              >
                {VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input
                placeholder="Color"
                maxLength={30}
                value={vehicleForm.color ?? ""}
                onChange={(e) => setVehicleForm((f) => ({ ...f, color: e.target.value }))}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
              />
              <input
                placeholder="Marca (ej. Toyota)"
                maxLength={50}
                value={vehicleForm.brand ?? ""}
                onChange={(e) => setVehicleForm((f) => ({ ...f, brand: e.target.value }))}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
              />
              <input
                placeholder="Modelo"
                maxLength={50}
                value={vehicleForm.model ?? ""}
                onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowVehicleForm(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-500 border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingVehicle}
                className="flex-1 py-2 text-xs font-semibold bg-[var(--tenant-primary)] text-white rounded-full hover:bg-blue-600 shadow-sm transition-all disabled:opacity-60"
              >
                {savingVehicle ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        )}

        {/* Lista vehículos */}
        <div className="divide-y divide-slate-100">
          {loadingVehicles ? (
            <div className="px-5 py-6 text-center text-sm text-slate-400">Cargando...</div>
          ) : vehicles.length === 0 ? (
            <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
              <Car className="w-8 h-8 text-slate-200" />
              <p className="text-sm text-slate-400">No hay vehículos registrados</p>
            </div>
          ) : (
            vehicles.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-bold text-slate-800">{v.plate}</p>
                  <p className="text-xs text-slate-500">
                    {v.type} {v.brand && `· ${v.brand}`} {v.model && `${v.model}`} {v.color && `· ${v.color}`}
                    {v.parkingSpot && ` · P.${v.parkingSpot}`}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteVehicle(v)}
                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Eliminar vehículo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ─── Mascotas ─────────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
              <PawPrint className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Mascotas</h3>
              <p className="text-xs text-slate-500">{pets.length} registrada(s)</p>
            </div>
          </div>
          <button
            onClick={() => setShowPetForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-full transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir
          </button>
        </div>

        {/* Formulario nueva mascota */}
        {showPetForm && (
          <form onSubmit={handleAddPet} className="px-5 py-4 bg-amber-50/40 border-b border-amber-100">
            <p className="text-xs font-semibold text-slate-600 mb-3">Nueva mascota</p>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2">
                <input
                  required
                  placeholder="Nombre de la mascota *"
                  maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                  value={petForm.name ?? ""}
                  onChange={(e) => setPetForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white"
                />
              </div>
              <select
                value={petForm.type ?? "Perro"}
                onChange={(e) => setPetForm((f) => ({ ...f, type: e.target.value }))}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white"
              >
                {PET_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input
                placeholder="Raza"
                maxLength={50}
                value={petForm.breed ?? ""}
                onChange={(e) => setPetForm((f) => ({ ...f, breed: e.target.value }))}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white"
              />
              <input
                placeholder="Color"
                maxLength={30}
                value={petForm.color ?? ""}
                onChange={(e) => setPetForm((f) => ({ ...f, color: e.target.value }))}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white"
              />
              <label className="col-span-2 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={petForm.isDangerousBreed ?? false}
                  onChange={(e) => setPetForm((f) => ({ ...f, isDangerousBreed: e.target.checked }))}
                  className="w-4 h-4 rounded text-amber-500"
                />
                <span className="text-xs text-slate-600">Raza potencialmente peligrosa</span>
              </label>
            </div>
            {petForm.isDangerousBreed && (
              <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700">
                  Se debe presentar certificado de seguro vigente a la administración.
                </p>
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowPetForm(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-500 border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingPet}
                className="flex-1 py-2 text-xs font-semibold bg-amber-500 text-white rounded-full hover:bg-amber-600 shadow-sm transition-all disabled:opacity-60"
              >
                {savingPet ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        )}

        {/* Lista mascotas */}
        <div className="divide-y divide-slate-100">
          {loadingPets ? (
            <div className="px-5 py-6 text-center text-sm text-slate-400">Cargando...</div>
          ) : pets.length === 0 ? (
            <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
              <PawPrint className="w-8 h-8 text-slate-200" />
              <p className="text-sm text-slate-400">No hay mascotas registradas</p>
            </div>
          ) : (
            pets.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-slate-800">{p.name}</p>
                    {p.isDangerousBreed && (
                      <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-semibold rounded-full">PPP</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {p.type} {p.breed && `· ${p.breed}`} {p.color && `· ${p.color}`}
                  </p>
                </div>
                <button
                  onClick={() => handleDeletePet(p)}
                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Eliminar mascota"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
