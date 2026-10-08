import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Building2,
  CreditCard,
  Flag,
  Activity,
  ShieldAlert,
  RotateCcw,
  Eye,
  MapPin,
  Layers,
  X,
  Edit3,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import { notificationService } from '../../services/notificationService';
import { FormField } from '../../components/ui/FormField';
import { Textarea } from '../../components/ui/Textarea';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import {
  formatNitInput,
  isValidNit,
  formatPhoneInput,
  COLOMBIAN_CITIES,
} from '../../utils/formatters';
import { sanitizeEmailInput } from '../../utils/sanitizers';
import type { PlatformTenant, Organization, AuditEvent } from '../../types/superAdmin';

export const TenantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<PlatformTenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null);
  const [isBulkUpdatingFeatures, setIsBulkUpdatingFeatures] = useState(false);

  // Plan modal state
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<
    Array<{
      id: string;
      name: string;
      tagline: string;
      basePriceCOP: number;
      pricePerUnitCOP: number;
      storageGB: number;
    }>
  >([]);

  // Suspend modal state
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('Mora en el pago de suscripción');
  const [isSuspending, setIsSuspending] = useState(false);

  // Edit community modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [editForm, setEditForm] = useState({
    name: '',
    nit: '',
    city: '',
    address: '',
    propertiesCount: 0,
    organizationId: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Audit log state
  const [tenantAudit, setTenantAudit] = useState<AuditEvent[]>([]);

  const availableFeatures = [
    { key: 'visitors', name: 'Visitantes & Pase QR', desc: 'Pre-autorizaciones y control en portería' },
    { key: 'packages', name: 'Paquetería', desc: 'Recepción y custodia en portería' },
    { key: 'pqrs', name: 'PQRS', desc: 'Peticiones, quejas y reclamos' },
    { key: 'maintenance', name: 'Mantenimiento', desc: 'Reportes y atención de averías' },
    { key: 'reservations', name: 'Reservas', desc: 'Zonas comunes y amenidades' },
    { key: 'staff', name: 'Trabajadores', desc: 'Directorio y turnos de colaboradores' },
    { key: 'documents', name: 'Documentos', desc: 'Repositorio de actas y reglamentos' },
    { key: 'pets', name: 'Mascotas', desc: 'Censo y registro de mascotas' },
    { key: 'vehicles', name: 'Vehículos', desc: 'Control de parqueaderos y placas' },
    { key: 'surveys', name: 'Encuestas & Asambleas', desc: 'Votaciones comunitarias y quórum' },
  ];

  const loadTenantAndAudit = useCallback(async () => {
    if (!id) return;
    const [t, auditList] = await Promise.all([
      superAdminService.getTenantById(id),
      superAdminService.getTenantAuditLog(id),
    ]);
    if (t) {
      setTenant({ ...t });
      setSelectedPlanId(t.planId);
    }
    setTenantAudit(auditList);
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    loadTenantAndAudit();
    superAdminService.getPlans().then((plans) => {
      setAvailablePlans(
        plans.map((p) => ({
          id: p.id,
          name: p.name,
          tagline: p.tagline,
          basePriceCOP: p.basePriceCOP,
          pricePerUnitCOP: p.pricePerUnitCOP,
          storageGB: p.storageGB,
        }))
      );
    });
    superAdminService.getOrganizations().then(setOrganizations);
  }, [loadTenantAndAudit]);

  const openEditModal = () => {
    if (!tenant) return;
    setEditForm({
      name: tenant.name || '',
      nit: tenant.nit || '',
      city: tenant.city || 'Cali',
      address: tenant.address || '',
      propertiesCount: tenant.propertiesCount || 0,
      organizationId: tenant.organizationId || '',
      adminName: tenant.adminName || '',
      adminEmail: tenant.adminEmail || tenant.contactEmail || '',
      adminPhone: tenant.adminPhone || tenant.phone || '',
    });
    setEditErrors({});
    setIsEditModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
        <p className="text-xs font-medium">Cargando información de la comunidad...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-3">
        <p className="text-base font-bold text-white">Comunidad no encontrada</p>
        <button
          onClick={() => navigate('/super-admin/tenants')}
          className="text-xs text-blue-400 hover:underline cursor-pointer"
        >
          Volver al directorio de comunidades
        </button>
      </div>
    );
  }

  const getTenantPortalUrl = () => {
    const currentHost = window.location.hostname;
    const targetDomain = currentHost.includes('.localhost') || currentHost === 'localhost'
      ? '.localhost'
      : '.' + currentHost.split('.').slice(-2).join('.');
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${protocol}//${tenant.subdomain}${targetDomain}${port}/admin`;
  };

  // Impersonation ("Acceder en Modo Soporte")
  const handleImpersonate = () => {
    superAdminService.recordAudit(
      'Modo Soporte Iniciado',
      'Comunidades',
      `Super Admin ingresó en modo vista de soporte a ${tenant.name}`,
      tenant.id,
      tenant.name,
      'Éxito'
    );
    notificationService.showToast(`Modo soporte activo para ${tenant.name}`, 'info');
    window.location.href = getTenantPortalUrl();
  };

  // Toggle individual feature for this tenant
  const handleToggleFeature = async (featureKey: string, currentEnabled: boolean) => {
    setTogglingFeature(featureKey);
    try {
      const ok = await superAdminService.toggleTenantFeature(tenant.id, featureKey, !currentEnabled);
      if (ok) {
        const featObj = availableFeatures.find((f) => f.key === featureKey);
        notificationService.showToast(
          `Módulo "${featObj?.name || featureKey}" ${!currentEnabled ? 'activado' : 'desactivado'} en ${tenant.name}`,
          'success'
        );
        await loadTenantAndAudit();
      } else {
        notificationService.showToast('No se pudo actualizar el módulo en el servidor', 'error');
      }
    } finally {
      setTogglingFeature(null);
    }
  };

  // Bulk enable/disable all features
  const handleBulkSetFeatures = async (enableAll: boolean) => {
    setIsBulkUpdatingFeatures(true);
    try {
      const newFeatures = enableAll ? availableFeatures.map((f) => f.key) : [];
      const updated = await superAdminService.updateTenant(tenant.id, {
        name: tenant.name,
        nit: tenant.nit,
        city: tenant.city,
        address: tenant.address,
        phone: tenant.phone,
        contactEmail: tenant.contactEmail,
        organizationId: tenant.organizationId,
        propertiesCount: tenant.propertiesCount,
        activeFeatures: newFeatures,
      });
      if (updated) {
        notificationService.showToast(
          enableAll
            ? `Todos los módulos fueron activados para ${tenant.name}`
            : `Todos los módulos fueron desactivados para ${tenant.name}`,
          'success'
        );
        await loadTenantAndAudit();
      } else {
        notificationService.showToast('Error al actualizar los módulos en bloque', 'error');
      }
    } finally {
      setIsBulkUpdatingFeatures(false);
    }
  };

  // Confirm change plan
  const handleConfirmPlanChange = async () => {
    if (!selectedPlanId) return;
    setIsSavingPlan(true);
    try {
      const ok = await superAdminService.changeTenantPlan(tenant.id, selectedPlanId);
      if (ok) {
        notificationService.showToast(`Plan SaaS actualizado para ${tenant.name}`, 'success');
        setIsChangingPlan(false);
        await loadTenantAndAudit();
      } else {
        notificationService.showToast('No se pudo cambiar el plan en el servidor', 'error');
      }
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Suspend
  const handleConfirmSuspend = async () => {
    if (!suspendReason.trim()) return;
    setIsSuspending(true);
    try {
      const ok = await superAdminService.suspendTenant(tenant.id, suspendReason.trim());
      if (ok) {
        notificationService.showToast(`Comunidad ${tenant.name} suspendida`, 'info');
        setIsSuspendModalOpen(false);
        await loadTenantAndAudit();
      } else {
        notificationService.showToast('Error al suspender la comunidad en el servidor', 'error');
      }
    } finally {
      setIsSuspending(false);
    }
  };

  // Reactivate
  const handleReactivate = async () => {
    const confirmed = await notificationService.showConfirm(
      '¿Reactivar Comunidad?',
      `¿Deseas restaurar el acceso operativo para ${tenant.name}?`,
      'Sí, reactivar',
      'Cancelar'
    );
    if (confirmed) {
      const ok = await superAdminService.reactivateTenant(tenant.id);
      if (ok) {
        notificationService.showToast(`Comunidad ${tenant.name} reactivada exitosamente`, 'success');
        await loadTenantAndAudit();
      } else {
        notificationService.showToast('No se pudo reactivar la comunidad', 'error');
      }
    }
  };

  // Save edited general information & organization & admin
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!editForm.name.trim()) {
      errs.name = 'El nombre de la comunidad es obligatorio.';
    }
    if (editForm.nit.trim() && !isValidNit(editForm.nit)) {
      errs.nit = 'Ingresa un NIT válido (ej: 901.456.789-0).';
    }
    if (!editForm.city.trim()) {
      errs.city = 'La ciudad es obligatoria.';
    }
    if (editForm.adminEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.adminEmail.trim())) {
      errs.adminEmail = 'Ingresa un correo electrónico válido.';
    }

    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }

    setIsSavingEdit(true);
    try {
      const updated = await superAdminService.updateTenant(tenant.id, {
        name: editForm.name.trim(),
        nit: editForm.nit.trim(),
        city: editForm.city.trim(),
        address: editForm.address.trim(),
        propertiesCount: Number(editForm.propertiesCount) || 0,
        organizationId: editForm.organizationId || undefined,
        adminName: editForm.adminName.trim(),
        adminEmail: editForm.adminEmail.trim(),
        adminPhone: editForm.adminPhone.trim(),
        phone: editForm.adminPhone.trim(),
        contactEmail: editForm.adminEmail.trim(),
      });

      if (updated) {
        notificationService.showToast(`Información de ${updated.name} actualizada`, 'success');
        setIsEditModalOpen(false);
        await loadTenantAndAudit();
      } else {
        notificationService.showToast('No se pudieron guardar los cambios en el servidor', 'error');
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/super-admin/tenants')}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title="Volver a Comunidades"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {tenant.name}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  tenant.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : tenant.status === 'TRIAL'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : tenant.status === 'PAST_DUE'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {tenant.status}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>NIT {tenant.nit || 'Sin NIT'}</span>
              <span>•</span>
              <a
                href={getTenantPortalUrl()}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1"
              >
                https://{tenant.subdomain}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Acceso en Modo Soporte + Editar + Acciones de Estado */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openEditModal}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-400" /> Editar Comunidad
          </button>

          {tenant.status === 'SUSPENDED' ? (
            <button
              onClick={handleReactivate}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reactivar Acceso
            </button>
          ) : (
            <button
              onClick={() => setIsSuspendModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-rose-400 border border-rose-900/40 hover:border-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Suspender
            </button>
          )}

          <button
            onClick={handleImpersonate}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-amber-900/20"
          >
            <Eye className="w-3.5 h-3.5" /> Acceder en Modo Soporte
          </button>
        </div>
      </div>

      {/* Suspended Alert Banner */}
      {tenant.status === 'SUSPENDED' && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-rose-300">
                Esta comunidad se encuentra suspendida temporalmente
              </h3>
              <p className="text-xs text-rose-200/80 mt-0.5">
                Motivo: <strong>{tenant.suspendedReason || 'Suspensión administrativa'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={handleReactivate}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer"
          >
            Restaurar Acceso Ahora
          </button>
        </div>
      )}

      {/* Grid de Secciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Información General, Organización & Plan/Suscripción */}
        <div className="space-y-6 lg:col-span-1">
          {/* 1. Información General */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-400" />
                Información General
              </h2>
              <button
                onClick={openEditModal}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
              >
                Editar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Ubicación</span>
                <span className="text-slate-200 font-medium flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {tenant.address ? `${tenant.address}, ${tenant.city}` : tenant.city}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Propiedades</span>
                  <span className="text-white font-mono font-bold text-sm">{tenant.propertiesCount} uds</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Usuarios Registrados</span>
                  <span className="text-white font-mono font-bold text-sm">{tenant.usersCount}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Administrador Designado</span>
                <div className="text-slate-200 font-bold mt-0.5">
                  {tenant.adminName || 'Administrador de Comunidad'}
                </div>
                <div className="text-slate-400 text-[11px] font-mono">
                  {tenant.adminEmail || 'Sin correo registrado'}
                </div>
                <div className="text-slate-500 text-[11px]">
                  {tenant.adminPhone || 'Sin teléfono registrado'}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Fecha de Registro</span>
                  <span className="text-slate-300 font-mono text-[11px]">{tenant.createdAt}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Almacenamiento</span>
                  <span className="text-slate-300 font-mono text-[11px]">
                    {tenant.storageUsedMB} / {Math.round(tenant.storageLimitMB / 1024)} GB
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Organización Matriz */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                Organización Administradora
              </h2>
              <button
                onClick={openEditModal}
                className="text-xs text-purple-400 hover:text-purple-300 font-bold cursor-pointer"
              >
                {tenant.organizationId ? 'Cambiar' : 'Vincular'}
              </button>
            </div>

            {tenant.organizationId ? (
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="font-bold text-white text-xs">{tenant.organizationName}</div>
                <p className="text-[11px] text-slate-400">
                  Esta comunidad forma parte del portafolio administrado por esta firma.
                </p>
                <button
                  onClick={() => navigate('/super-admin/organizations')}
                  className="text-xs text-purple-400 hover:underline pt-1 block font-semibold cursor-pointer"
                >
                  Ver Firma Inmobiliaria →
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Comunidad independiente (sin empresa matriz intermediaria).
              </p>
            )}
          </div>

          {/* 3. Plan & Suscripción SaaS */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Plan & Suscripción SaaS
              </h2>
              <button
                onClick={() => {
                  if (availablePlans.length > 0 && !availablePlans.some((p) => p.id === selectedPlanId)) {
                    const matchByName = availablePlans.find(
                      (p) => p.name.toLowerCase() === tenant.planName.toLowerCase()
                    );
                    setSelectedPlanId(matchByName ? matchByName.id : availablePlans[0].id);
                  }
                  setIsChangingPlan(true);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
              >
                Cambiar Plan
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{tenant.planName}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400">
                  {tenant.status}
                </span>
              </div>
              <div className="text-xl font-black text-emerald-400 font-mono">
                ${tenant.mrrCOP.toLocaleString('es-CO')}{' '}
                <span className="text-xs text-slate-400 font-normal">COP /mes</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {tenant.propertiesCount} unidades residenciales contratadas
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Features Activas & Actividad Reciente */}
        <div className="space-y-6 lg:col-span-2">
          {/* 4. Features de Producto en esta Comunidad */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Flag className="w-4 h-4 text-purple-400" />
                    Módulos & Features Habilitadas
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    {tenant.activeFeatures.length} / {availableFeatures.length} activos
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Activa o desactiva capacidades funcionales directamente para esta copropiedad.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isBulkUpdatingFeatures || tenant.activeFeatures.length === availableFeatures.length}
                  onClick={() => handleBulkSetFeatures(true)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 disabled:opacity-40 cursor-pointer transition-colors"
                >
                  Activar todos
                </button>
                <button
                  type="button"
                  disabled={isBulkUpdatingFeatures || tenant.activeFeatures.length === 0}
                  onClick={() => handleBulkSetFeatures(false)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 disabled:opacity-40 cursor-pointer transition-colors"
                >
                  Desactivar todos
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableFeatures.map((f) => {
                const isEnabled = tenant.activeFeatures.includes(f.key);
                const isUpdatingThis = togglingFeature === f.key;
                return (
                  <div
                    key={f.key}
                    className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 transition-colors ${
                      isEnabled
                        ? 'bg-slate-950/90 border-emerald-500/20'
                        : 'bg-slate-950/50 border-slate-800/80 opacity-80'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs">{f.name}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{f.desc}</div>
                    </div>

                    <button
                      type="button"
                      disabled={isUpdatingThis || isBulkUpdatingFeatures}
                      onClick={() => handleToggleFeature(f.key, isEnabled)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                        isEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-rose-500/20 hover:text-rose-300'
                          : 'bg-slate-800 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-300'
                      }`}
                    >
                      {isUpdatingThis ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isEnabled ? (
                        'Activo ✓'
                      ) : (
                        'Inactivo ✕'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Actividad Reciente de la Comunidad */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                Historial de Actividad & Auditoría
              </h2>
              <span className="text-[11px] text-slate-500 font-mono">
                {tenantAudit.length} {tenantAudit.length === 1 ? 'evento' : 'eventos'}
              </span>
            </div>

            {tenantAudit.length > 0 ? (
              <div className="divide-y divide-slate-800/70 max-h-80 overflow-y-auto pr-1">
                {tenantAudit.map((e) => (
                  <div key={e.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{e.action}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            e.result === 'Advertencia'
                              ? 'bg-amber-500/10 text-amber-400'
                              : e.result === 'Error'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {e.result}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px]">{e.details}</div>
                    </div>
                    <div className="text-right shrink-0 text-slate-500 font-mono text-[10px]">
                      <div>{e.timestamp}</div>
                      <div>{e.actorName}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs">
                Sin eventos críticos recientes registrados para esta comunidad.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Plan Modal */}
      {isChangingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Cambiar Plan SaaS
              </h3>
              <button
                onClick={() => setIsChangingPlan(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {availablePlans.map((p) => {
                const isSelected = selectedPlanId === p.id;
                const estimatedMrr = (tenant.propertiesCount || 0) * (p.pricePerUnitCOP || 0);
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between font-bold text-xs text-white">
                      <span className="flex items-center gap-1.5">
                        {p.name}
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                      </span>
                      <span className="font-mono text-emerald-400">
                        ${p.pricePerUnitCOP.toLocaleString('es-CO')} COP/ud
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{p.tagline}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      Facturación mensual estimada ({tenant.propertiesCount} uds): $
                      {estimatedMrr.toLocaleString('es-CO')} COP/mes
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsChangingPlan(false)}
                className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPlanChange}
                disabled={isSavingPlan || !selectedPlanId}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isSavingPlan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Guardar Nuevo Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Community Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveEdit}
            className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                Editar Comunidad
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <FormField
                  id="edit-tenant-name"
                  label="Nombre de la Comunidad"
                  required
                  theme="dark"
                  maxLength={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH}
                  currentLength={editForm.name.length}
                  error={editErrors.name}
                >
                  <input
                    id="edit-tenant-name"
                    type="text"
                    maxLength={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH}
                    value={editForm.name}
                    onChange={(e) => {
                      setEditForm({ ...editForm, name: e.target.value });
                      if (editErrors.name) setEditErrors({ ...editErrors, name: '' });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </FormField>
              </div>

              <FormField
                id="edit-tenant-nit"
                label="NIT"
                theme="dark"
                error={editErrors.nit}
              >
                <input
                  id="edit-tenant-nit"
                  type="text"
                  maxLength={FIELD_LIMITS.NIT_MAX_LENGTH}
                  value={editForm.nit}
                  onChange={(e) => {
                    setEditForm({ ...editForm, nit: formatNitInput(e.target.value) });
                    if (editErrors.nit) setEditErrors({ ...editErrors, nit: '' });
                  }}
                  placeholder="901.456.789-0"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </FormField>

              <FormField
                id="edit-tenant-city"
                label="Ciudad"
                required
                theme="dark"
                error={editErrors.city}
              >
                <input
                  id="edit-tenant-city"
                  type="text"
                  list="tenant-edit-cities"
                  maxLength={FIELD_LIMITS.CITY_MAX_LENGTH}
                  value={editForm.city}
                  onChange={(e) => {
                    setEditForm({ ...editForm, city: e.target.value });
                    if (editErrors.city) setEditErrors({ ...editErrors, city: '' });
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <datalist id="tenant-edit-cities">
                  {COLOMBIAN_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </FormField>

              <div className="sm:col-span-2">
                <FormField
                  id="edit-tenant-address"
                  label="Dirección Física"
                  theme="dark"
                  maxLength={FIELD_LIMITS.ADDRESS_MAX_LENGTH}
                  currentLength={editForm.address.length}
                >
                  <input
                    id="edit-tenant-address"
                    type="text"
                    maxLength={FIELD_LIMITS.ADDRESS_MAX_LENGTH}
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </FormField>
              </div>

              <FormField
                id="edit-tenant-units"
                label="Unidades Contratadas"
                theme="dark"
              >
                <input
                  id="edit-tenant-units"
                  type="number"
                  min={0}
                  max={10000}
                  value={editForm.propertiesCount}
                  onChange={(e) =>
                    setEditForm({ ...editForm, propertiesCount: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </FormField>

              <FormField
                id="edit-tenant-org"
                label="Organización Administradora"
                theme="dark"
              >
                <select
                  id="edit-tenant-org"
                  value={editForm.organizationId}
                  onChange={(e) => setEditForm({ ...editForm, organizationId: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Independiente (Sin organización)</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.nit})
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="sm:col-span-2 pt-2 border-t border-slate-800">
                <p className="text-[11px] font-bold uppercase text-slate-400 mb-2">
                  Administrador Designado
                </p>
              </div>

              <div className="sm:col-span-2">
                <FormField
                  id="edit-admin-name"
                  label="Nombre del Administrador"
                  theme="dark"
                  maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                  currentLength={editForm.adminName.length}
                >
                  <input
                    id="edit-admin-name"
                    type="text"
                    maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                    value={editForm.adminName}
                    onChange={(e) => setEditForm({ ...editForm, adminName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </FormField>
              </div>

              <FormField
                id="edit-admin-email"
                label="Correo del Administrador"
                theme="dark"
                error={editErrors.adminEmail}
              >
                <input
                  id="edit-admin-email"
                  type="email"
                  autoComplete="email"
                  maxLength={FIELD_LIMITS.EMAIL_MAX_LENGTH}
                  value={editForm.adminEmail}
                  onChange={(e) => {
                    setEditForm({ ...editForm, adminEmail: sanitizeEmailInput(e.target.value) });
                    if (editErrors.adminEmail) setEditErrors({ ...editErrors, adminEmail: '' });
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </FormField>

              <FormField
                id="edit-admin-phone"
                label="Teléfono de Contacto"
                theme="dark"
              >
                <input
                  id="edit-admin-phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={FIELD_LIMITS.PHONE_MAX_LENGTH}
                  value={editForm.adminPhone}
                  onChange={(e) => setEditForm({ ...editForm, adminPhone: formatPhoneInput(e.target.value) })}
                  placeholder="+57 300 123 4567"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </FormField>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isSavingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Suspend Modal */}
      {isSuspendModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-slate-800 border-b">
              <h3 className="font-black text-base flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                Suspender Comunidad
              </h3>
              <button
                type="button"
                onClick={() => setIsSuspendModalOpen(false)}
                aria-label="Cerrar modal"
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              ¿Estás seguro de suspender a <strong>{tenant.name}</strong>? Los usuarios perderán acceso al sistema hasta que se reactive.
            </p>

            <FormField
              id="detail-suspend-reason"
              label="Motivo de la Suspensión"
              required
              theme="dark"
              maxLength={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH}
              currentLength={suspendReason.length}
              alwaysShowCounter
              error={!suspendReason.trim() ? 'El motivo de la suspensión es obligatorio.' : undefined}
            >
              <Textarea
                theme="dark"
                maxLength={FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value.slice(0, FIELD_LIMITS.OBSERVATIONS_MAX_LENGTH))}
                rows={3}
                placeholder="Indica la justificación comercial o legal..."
              />
            </FormField>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSuspendModalOpen(false)}
                className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={!suspendReason.trim() || isSuspending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isSuspending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Suspender Acceso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
