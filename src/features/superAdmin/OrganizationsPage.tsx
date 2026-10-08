import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import { notificationService } from '../../services/notificationService';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import {
  formatNitInput,
  isValidNit,
  formatPhoneInput,
  COLOMBIAN_CITIES,
} from '../../utils/formatters';
import { normalizeEmail, sanitizeEmailInput, normalizeWhitespace } from '../../utils/sanitizers';
import type { Organization, PlatformTenant } from '../../types/superAdmin';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const OrganizationsPage = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>('org-valle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // New Org Form
  const [formData, setFormData] = useState({
    name: '',
    nit: '',
    email: '',
    phone: '',
    city: 'Cali',
    address: '',
  });

  const loadData = () => {
    superAdminService.getOrganizations().then(setOrganizations);
    superAdminService.getTenants().then(setTenants);
  };

  useEffect(() => {
    loadData();
  }, []);

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const cleanName = normalizeWhitespace(formData.name);

    if (!cleanName) {
      newErrors.name = 'La razón social es obligatoria.';
    } else if (cleanName.length < 3) {
      newErrors.name = 'La razón social debe tener al menos 3 caracteres.';
    }

    if (!formData.nit.trim()) {
      newErrors.nit = 'El NIT es obligatorio.';
    } else if (!isValidNit(formData.nit)) {
      newErrors.nit = 'Ingresa un NIT válido (ej. 901.456.789-0).';
    }

    if (formData.phone.trim()) {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length < FIELD_LIMITS.PHONE_MIN_LENGTH) {
        newErrors.phone = 'Ingresa un número de teléfono válido (mínimo 7 dígitos).';
      }
    }

    if (formData.email.trim() && !EMAIL_REGEX.test(normalizeEmail(formData.email))) {
      newErrors.email = 'Ingresa un correo electrónico válido (ej: admin@empresa.com).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      ...formData,
      name: normalizeWhitespace(formData.name),
      nit: formData.nit.trim(),
      email: normalizeEmail(formData.email),
      phone: formData.phone.trim(),
      city: normalizeWhitespace(formData.city) || 'Cali',
      address: normalizeWhitespace(formData.address),
    };

    await superAdminService.createOrganization(payload);
    notificationService.showToast(`Organización ${payload.name} registrada exitosamente`, 'success');
    setIsModalOpen(false);
    setErrors({});
    setFormData({ name: '', nit: '', email: '', phone: '', city: 'Cali', address: '' });
    loadData();
  };

  const filteredOrgs = organizations.filter(
    o => o.name.toLowerCase().includes(search.toLowerCase()) || o.nit.includes(search) || o.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-400" />
            Organizaciones
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Firmas inmobiliarias y empresas administradoras que gestionan múltiples comunidades residenciales.
          </p>
        </div>

        <button
          onClick={() => {
            setErrors({});
            setIsModalOpen(true);
          }}
          className="bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl text-xs font-bold px-4 py-2.5 shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Nueva Organización
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            maxLength={FIELD_LIMITS.SEARCH_MAX_LENGTH}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por razón social, NIT o ciudad..."
            aria-label="Buscar organizaciones por razón social, NIT o ciudad"
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Hierarchical View: ORGANIZACIÓN ↓ COMUNIDADES */}
      <div className="space-y-4">
        {filteredOrgs.map((org) => {
          const orgTenants = tenants.filter(t => t.organizationId === org.id);
          const isExpanded = expandedOrgId === org.id;

          return (
            <div
              key={org.id}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl hover:border-slate-700/80 transition-colors"
            >
              {/* Organization Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white text-base">{org.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {org.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>NIT: {org.nit}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {org.city} — {org.address}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => setExpandedOrgId(isExpanded ? null : org.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{orgTenants.length} Comunidades</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setErrors({});
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Nueva Organización"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Collapsible Communities Grid */}
              {isExpanded && (
                <div className="pt-3 border-t border-slate-800/80 space-y-3">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Comunidades bajo esta administración ({orgTenants.length})
                  </div>

                  {orgTenants.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                      {orgTenants.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => navigate(`/super-admin/tenants/${t.id}`)}
                          className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-950 transition-all cursor-pointer group space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs group-hover:text-blue-400 transition-colors truncate">
                              {t.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0">
                              {t.propertiesCount} uds
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Plan {t.planName}</span>
                            <span className={`text-[10px] font-semibold ${
                              t.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/50 text-center text-xs text-slate-500">
                      Esta organización aún no tiene comunidades asignadas.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredOrgs.length === 0 && (
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
            <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-bold text-white">No se encontraron organizaciones</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search ? 'No hay organizaciones que coincidan con la búsqueda.' : 'Aún no se han registrado organizaciones en la plataforma.'}
            </p>
            <button
              onClick={() => {
                setErrors({});
                setIsModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Registrar Primera Organización
            </button>
          </div>
        )}
      </div>

      {/* New Organization Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                Registrar Organización
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrg} noValidate className="space-y-3.5 text-xs">
              <FormField
                id="org-name"
                label="Razón Social"
                required
                theme="dark"
                maxLength={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH}
                currentLength={formData.name.length}
                error={errors.name}
              >
                <Input
                  theme="dark"
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH}
                  value={formData.name}
                  onChange={(e) => {
                    clearError('name');
                    setFormData({ ...formData, name: e.target.value.slice(0, FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH) });
                  }}
                  placeholder="Ej. Administraciones y Condominios del Valle SAS"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  id="org-nit"
                  label="NIT"
                  required
                  theme="dark"
                  error={errors.nit}
                >
                  <Input
                    theme="dark"
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={FIELD_LIMITS.NIT_MAX_LENGTH}
                    value={formData.nit}
                    onChange={(e) => {
                      clearError('nit');
                      setFormData({ ...formData, nit: formatNitInput(e.target.value) });
                    }}
                    placeholder="901.456.789-0"
                    className="font-mono"
                  />
                </FormField>

                <FormField
                  id="org-city"
                  label="Ciudad"
                  theme="dark"
                  error={errors.city}
                >
                  <Input
                    theme="dark"
                    type="text"
                    list="org-colombian-cities"
                    maxLength={FIELD_LIMITS.CITY_MAX_LENGTH}
                    value={formData.city}
                    onChange={(e) => {
                      clearError('city');
                      setFormData({ ...formData, city: e.target.value.slice(0, FIELD_LIMITS.CITY_MAX_LENGTH) });
                    }}
                    placeholder="Seleccione o escriba..."
                  />
                </FormField>
              </div>

              <datalist id="org-colombian-cities">
                {COLOMBIAN_CITIES.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  id="org-phone"
                  label="Teléfono"
                  theme="dark"
                  error={errors.phone}
                >
                  <Input
                    theme="dark"
                    type="tel"
                    autoComplete="tel"
                    maxLength={FIELD_LIMITS.PHONE_MAX_LENGTH}
                    value={formData.phone}
                    onChange={(e) => {
                      clearError('phone');
                      setFormData({ ...formData, phone: formatPhoneInput(e.target.value) });
                    }}
                    placeholder="+57 300 123 4567"
                  />
                </FormField>

                <FormField
                  id="org-address"
                  label="Dirección"
                  theme="dark"
                  maxLength={FIELD_LIMITS.ADDRESS_MAX_LENGTH}
                  currentLength={formData.address.length}
                  error={errors.address}
                >
                  <Input
                    theme="dark"
                    type="text"
                    autoComplete="street-address"
                    maxLength={FIELD_LIMITS.ADDRESS_MAX_LENGTH}
                    value={formData.address}
                    onChange={(e) => {
                      clearError('address');
                      setFormData({ ...formData, address: e.target.value.slice(0, FIELD_LIMITS.ADDRESS_MAX_LENGTH) });
                    }}
                    placeholder="Av. 6N # 28N-45, Of. 402"
                  />
                </FormField>
              </div>

              <FormField
                id="org-email"
                label="Correo Principal"
                theme="dark"
                error={errors.email}
              >
                <Input
                  theme="dark"
                  type="email"
                  autoComplete="email"
                  maxLength={FIELD_LIMITS.EMAIL_MAX_LENGTH}
                  value={formData.email}
                  onChange={(e) => {
                    clearError('email');
                    setFormData({ ...formData, email: sanitizeEmailInput(e.target.value) });
                  }}
                  onBlur={() => {
                    if (formData.email) {
                      setFormData((prev) => ({ ...prev, email: normalizeEmail(prev.email) }));
                    }
                  }}
                  placeholder="contacto@inmobiliaria.com"
                />
              </FormField>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-sm transition-colors cursor-pointer"
                >
                  Crear Organización
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

