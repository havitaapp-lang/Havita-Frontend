import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  Edit2,
  ShieldAlert,
  RotateCcw,
  Building,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import { NewTenantModal } from '../../components/superAdmin/NewTenantModal';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { notificationService } from '../../services/notificationService';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import { formatPhoneInput, COLOMBIAN_CITIES } from '../../utils/formatters';
import { normalizeEmail, sanitizeEmailInput, normalizeWhitespace } from '../../utils/sanitizers';
import type { PlatformTenant } from '../../types/superAdmin';

const ITEMS_PER_PAGE = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const TenantsPage = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [availablePlans, setAvailablePlans] = useState<Array<{ id: string; name: string }>>([]);
  const [availableOrgs, setAvailableOrgs] = useState<Array<{ id: string; name: string }>>([]);

  const [isNewTenantOpen, setIsNewTenantOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<PlatformTenant | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [suspendingTenant, setSuspendingTenant] = useState<PlatformTenant | null>(null);
  const [suspendReason, setSuspendReason] = useState('Mora en el pago de suscripción');

  const loadTenants = useCallback(() => {
    superAdminService
      .getTenants({
        search,
        status: statusFilter,
        plan: planFilter,
        orgId: orgFilter,
      })
      .then((data) => {
        setTenants(data);
        setCurrentPage(1);
      });
  }, [search, statusFilter, planFilter, orgFilter]);

  useEffect(() => {
    loadTenants();
    superAdminService.getPlans().then(plans => setAvailablePlans(plans.map(p => ({ id: p.id, name: p.name }))));
    superAdminService.getOrganizations().then(orgs => setAvailableOrgs(orgs.map(o => ({ id: o.id, name: o.name }))));
  }, [loadTenants]);

  const handleConfirmSuspend = async () => {
    if (!suspendingTenant || !suspendReason.trim()) return;
    await superAdminService.suspendTenant(suspendingTenant.id, normalizeWhitespace(suspendReason));
    notificationService.showToast(`Comunidad ${suspendingTenant.name} suspendida`, 'info');
    setSuspendingTenant(null);
    loadTenants();
  };

  const handleReactivate = async (t: PlatformTenant) => {
    const confirmed = await notificationService.showConfirm(
      '¿Reactivar Comunidad?',
      `¿Deseas restaurar el acceso completo para ${t.name}?`,
      'Sí, reactivar',
      'Cancelar'
    );
    if (confirmed) {
      await superAdminService.reactivateTenant(t.id);
      notificationService.showToast(`Comunidad ${t.name} reactivada exitosamente`, 'success');
      loadTenants();
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    const newErrors: Record<string, string> = {};
    const cleanName = normalizeWhitespace(editingTenant.name);
    const cleanCity = normalizeWhitespace(editingTenant.city);

    if (!cleanName) {
      newErrors.name = 'El nombre de la comunidad es obligatorio.';
    } else if (cleanName.length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres.';
    }

    if (!cleanCity) {
      newErrors.city = 'La ciudad es obligatoria.';
    }

    if (editingTenant.contactEmail?.trim() && !EMAIL_REGEX.test(normalizeEmail(editingTenant.contactEmail))) {
      newErrors.contactEmail = 'Ingresa un correo electrónico válido.';
    }

    if (editingTenant.phone?.trim()) {
      const digits = editingTenant.phone.replace(/\D/g, '');
      if (digits.length < FIELD_LIMITS.PHONE_MIN_LENGTH) {
        newErrors.phone = 'Ingresa un teléfono válido (mínimo 7 dígitos).';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setEditErrors(newErrors);
      return;
    }

    await superAdminService.updateTenant(editingTenant.id, {
      name: cleanName,
      city: cleanCity,
      address: normalizeWhitespace(editingTenant.address || ''),
      phone: editingTenant.phone?.trim() || '',
      contactEmail: editingTenant.contactEmail ? normalizeEmail(editingTenant.contactEmail) : '',
      organizationId: editingTenant.organizationId || null,
      organizationName: availableOrgs.find(o => o.id === editingTenant.organizationId)?.name,
    } as any);
    notificationService.showToast(`Datos de ${cleanName} actualizados`, 'success');
    setEditingTenant(null);
    setEditErrors({});
    loadTenants();
  };

  // Pagination calculation
  const totalPages = Math.ceil(tenants.length / ITEMS_PER_PAGE) || 1;
  const paginatedTenants = tenants.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Building className="w-6 h-6 text-blue-400" />
            Comunidades (Tenants)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Directorio maestro de copropiedades registradas en Havita SaaS.
          </p>
        </div>

        <button
          onClick={() => setIsNewTenantOpen(true)}
          className="bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl text-xs font-bold px-4 py-2.5 shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Nueva Comunidad
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              maxLength={FIELD_LIMITS.SEARCH_MAX_LENGTH}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, NIT, ciudad..."
              aria-label="Buscar comunidades por nombre, NIT o ciudad"
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="ACTIVE">🟢 Activa</option>
              <option value="TRIAL">🔵 En Prueba</option>
              <option value="PAST_DUE">🟡 En Mora</option>
              <option value="SUSPENDED">🔴 Suspendida</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Todos los Planes</option>
              {availablePlans.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Organization Filter */}
          <div>
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Todas las Organizaciones</option>
              {availableOrgs.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tenants Table (Requerimiento 7 exacto) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nombre</th>
                <th className="py-3.5 px-4">Organización</th>
                <th className="py-3.5 px-4">Ciudad</th>
                <th className="py-3.5 px-4">Plan</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4">Propiedades</th>
                <th className="py-3.5 px-4">Usuarios</th>
                <th className="py-3.5 px-4">Fecha Creación</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {paginatedTenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Nombre */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-white hover:text-blue-400 transition-colors cursor-pointer" onClick={() => navigate(`/super-admin/tenants/${t.id}`)}>
                      {t.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      NIT {t.nit} • {t.subdomain}
                    </div>
                  </td>

                  {/* Organización */}
                  <td className="py-3 px-4 text-slate-400">
                    {t.organizationName ? (
                      <span className="truncate block max-w-[130px]" title={t.organizationName}>
                        {t.organizationName}
                      </span>
                    ) : (
                      <span className="italic text-slate-500">Directa</span>
                    )}
                  </td>

                  {/* Ciudad */}
                  <td className="py-3 px-4 text-slate-300">{t.city}</td>

                  {/* Plan */}
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                      {t.planName}
                    </span>
                  </td>

                  {/* Estado */}
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : t.status === 'TRIAL'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : t.status === 'PAST_DUE'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {t.status}
                    </span>
                  </td>

                  {/* Propiedades */}
                  <td className="py-3 px-4 font-mono font-medium text-slate-200">
                    {t.propertiesCount} uds
                  </td>

                  {/* Usuarios */}
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {t.usersCount}
                  </td>

                  {/* Fecha creación */}
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                    {t.createdAt}
                  </td>

                  {/* Acciones */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => navigate(`/super-admin/tenants/${t.id}`)}
                        className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Ver Detalle"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setEditingTenant({ ...t })}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                        title="Editar datos básicos"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {t.status === 'SUSPENDED' ? (
                        <button
                          onClick={() => handleReactivate(t)}
                          className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Reactivar comunidad"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setSuspendingTenant(t)}
                          className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Suspender comunidad"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {tenants.length === 0 && (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <p className="font-bold text-slate-200">No se encontraron comunidades con los filtros actuales.</p>
            <button
              onClick={() => { setSearch(''); setStatusFilter('ALL'); setPlanFilter('ALL'); setOrgFilter('ALL'); }}
              className="text-xs text-blue-400 hover:underline"
            >
              Restablecer filtros
            </button>
          </div>
        )}

        {/* Pagination Bar */}
        {tenants.length > 0 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
            <span>
              Mostrando <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> a{' '}
              <strong>{Math.min(currentPage * ITEMS_PER_PAGE, tenants.length)}</strong> de{' '}
              <strong>{tenants.length}</strong> comunidades
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-white">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Community Modal */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                Editar Datos Básicos
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingTenant(null);
                  setEditErrors({});
                }}
                aria-label="Cerrar modal"
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} noValidate className="space-y-3.5 text-xs">
              <FormField
                id="edit-tenant-name"
                label="Nombre de la Comunidad"
                required
                theme="dark"
                maxLength={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH}
                currentLength={editingTenant.name.length}
                error={editErrors.name}
              >
                <Input
                  theme="dark"
                  type="text"
                  maxLength={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH}
                  value={editingTenant.name}
                  onChange={(e) => {
                    setEditErrors((prev) => ({ ...prev, name: '' }));
                    setEditingTenant({ ...editingTenant, name: e.target.value.slice(0, FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH) });
                  }}
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  id="edit-tenant-city"
                  label="Ciudad"
                  required
                  theme="dark"
                  error={editErrors.city}
                >
                  <Input
                    theme="dark"
                    type="text"
                    list="edit-tenant-cities"
                    maxLength={FIELD_LIMITS.CITY_MAX_LENGTH}
                    value={editingTenant.city}
                    onChange={(e) => {
                      setEditErrors((prev) => ({ ...prev, city: '' }));
                      setEditingTenant({ ...editingTenant, city: e.target.value.slice(0, FIELD_LIMITS.CITY_MAX_LENGTH) });
                    }}
                    required
                  />
                </FormField>

                <FormField
                  id="edit-tenant-address"
                  label="Dirección"
                  theme="dark"
                  maxLength={FIELD_LIMITS.ADDRESS_MAX_LENGTH}
                  currentLength={(editingTenant.address || '').length}
                >
                  <Input
                    theme="dark"
                    type="text"
                    autoComplete="street-address"
                    maxLength={FIELD_LIMITS.ADDRESS_MAX_LENGTH}
                    value={editingTenant.address || ''}
                    onChange={(e) => setEditingTenant({ ...editingTenant, address: e.target.value.slice(0, FIELD_LIMITS.ADDRESS_MAX_LENGTH) })}
                  />
                </FormField>
              </div>

              <datalist id="edit-tenant-cities">
                {COLOMBIAN_CITIES.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>

              <FormField
                id="edit-tenant-org"
                label="Organización Matriz"
                theme="dark"
              >
                <select
                  value={editingTenant.organizationId || ''}
                  onChange={(e) => setEditingTenant({ ...editingTenant, organizationId: e.target.value || undefined })}
                  className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">Directa (Sin organización)</option>
                  {availableOrgs.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  id="edit-tenant-email"
                  label="Correo Principal"
                  theme="dark"
                  error={editErrors.contactEmail}
                >
                  <Input
                    theme="dark"
                    type="email"
                    autoComplete="email"
                    maxLength={FIELD_LIMITS.EMAIL_MAX_LENGTH}
                    value={editingTenant.contactEmail || ''}
                    onChange={(e) => {
                      setEditErrors((prev) => ({ ...prev, contactEmail: '' }));
                      setEditingTenant({ ...editingTenant, contactEmail: sanitizeEmailInput(e.target.value) });
                    }}
                    onBlur={() => {
                      if (editingTenant.contactEmail) {
                        setEditingTenant({ ...editingTenant, contactEmail: normalizeEmail(editingTenant.contactEmail) });
                      }
                    }}
                    placeholder="admin@edificio.com"
                  />
                </FormField>

                <FormField
                  id="edit-tenant-phone"
                  label="Teléfono"
                  theme="dark"
                  error={editErrors.phone}
                >
                  <Input
                    theme="dark"
                    type="tel"
                    autoComplete="tel"
                    maxLength={FIELD_LIMITS.PHONE_MAX_LENGTH}
                    value={editingTenant.phone || ''}
                    onChange={(e) => {
                      setEditErrors((prev) => ({ ...prev, phone: '' }));
                      setEditingTenant({ ...editingTenant, phone: formatPhoneInput(e.target.value) });
                    }}
                    placeholder="+57 300 000 0000"
                  />
                </FormField>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTenant(null);
                    setEditErrors({});
                  }}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend Modal with Mandatory Reason */}
      {suspendingTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-white text-base flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                Suspender Comunidad
              </h3>
              <button
                type="button"
                onClick={() => setSuspendingTenant(null)}
                aria-label="Cerrar modal"
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              ¿Estás seguro de suspender el acceso a <strong>{suspendingTenant.name}</strong>? Los datos se conservarán intactos pero los residentes y administradores no podrán ingresar.
            </p>

            <FormField
              id="suspend-tenant-reason"
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
                onClick={() => setSuspendingTenant(null)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={!suspendReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 cursor-pointer"
              >
                Confirmar Suspensión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Tenant Modal */}
      <NewTenantModal
        isOpen={isNewTenantOpen}
        onClose={() => setIsNewTenantOpen(false)}
        onTenantCreated={(newTenant) => {
          loadTenants();
          navigate(`/super-admin/tenants/${newTenant.id}`);
        }}
      />
    </div>
  );
};
