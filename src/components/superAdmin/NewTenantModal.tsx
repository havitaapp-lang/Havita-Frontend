import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight, ArrowLeft, Building } from 'lucide-react';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { notificationService } from '../../services/notificationService';
import { superAdminService } from '../../services/superAdminService';
import { planService } from '../../services/planService';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import { formatNitInput, isValidNit, COLOMBIAN_CITIES } from '../../utils/formatters';
import { normalizeEmail, sanitizeEmailInput, normalizeWhitespace } from '../../utils/sanitizers';
import type { PlatformTenant } from '../../types/superAdmin';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface NewTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTenantCreated: (tenant: PlatformTenant) => void;
}

const STEPS = [
  { id: 1, name: 'Identidad', desc: 'Nombre, NIT y ubicación' },
  { id: 2, name: 'Plan & Capacidad', desc: 'Unidades y plan SaaS' }
];

export const NewTenantModal: React.FC<NewTenantModalProps> = ({
  isOpen,
  onClose,
  onTenantCreated,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubdomainEdited, setIsSubdomainEdited] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availablePlans, setAvailablePlans] = useState<Array<{ id: string; name: string; tagline: string; pricePerUnitCOP: number; basePriceCOP: number; maxProperties: number }>>([]);
  const [availableOrgs, setAvailableOrgs] = useState<Array<{ id: string; name: string }>>([]);

  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    city: 'Cali',
    nit: '',
    address: '',
    contactEmail: '',
    organizationId: 'DIRECT',
    propertiesCount: 120,
    planId: 'plan-pro',
  });

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      planService.getPlans().then(plans => setAvailablePlans(plans.map(p => ({ 
          id: p.id, 
          name: p.name, 
          tagline: p.tagline || '', 
          pricePerUnitCOP: p.grossPricePerProperty, 
          basePriceCOP: 0, 
          maxProperties: p.maxProperties || 10000 
      }))));
      superAdminService.getOrganizations().then(orgs => setAvailableOrgs(orgs.map(o => ({ id: o.id, name: o.name }))));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleNameChange = (val: string) => {
    const cleanVal = val.slice(0, FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH);
    clearError('name');
    setFormData(prev => {
      const updates: Partial<typeof formData> = { name: cleanVal };
      if (!isSubdomainEdited) {
        updates.subdomain = cleanVal
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/^-+|-+$/g, '')
          .trim()
          .slice(0, FIELD_LIMITS.SUBDOMAIN_MAX_LENGTH);
      }
      return { ...prev, ...updates };
    });
  };

  const handleSubdomainChange = (val: string) => {
    setIsSubdomainEdited(true);
    clearError('subdomain');
    setFormData(prev => ({
      ...prev,
      subdomain: val
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/^-+|-+$/g, '')
        .slice(0, FIELD_LIMITS.SUBDOMAIN_MAX_LENGTH),
    }));
  };

  const selectedPlan = availablePlans.find(p => p.id === formData.planId) || availablePlans[0] || { id: 'plan-pro', name: 'Pro', tagline: '', pricePerUnitCOP: 0, basePriceCOP: 0 };

  const validateStep1 = (): boolean => {
    const stepErrors: Record<string, string> = {};
    const cleanName = normalizeWhitespace(formData.name);

    if (!cleanName) {
      stepErrors.name = 'El nombre de la comunidad es obligatorio.';
    } else if (cleanName.length < 3) {
      stepErrors.name = 'El nombre debe tener al menos 3 caracteres.';
    }

    if (!formData.nit.trim()) {
      stepErrors.nit = 'El NIT de la copropiedad es obligatorio.';
    } else if (!isValidNit(formData.nit)) {
      stepErrors.nit = 'Ingresa un NIT válido (ej. 901.456.789-2).';
    }

    if (!formData.contactEmail.trim()) {
      stepErrors.contactEmail = 'El correo electrónico principal es obligatorio.';
    } else if (!EMAIL_REGEX.test(normalizeEmail(formData.contactEmail))) {
      stepErrors.contactEmail = 'Ingresa un correo electrónico válido.';
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
    }
    if (currentStep === 2) {
      if (!formData.propertiesCount || formData.propertiesCount <= 0) {
        notificationService.showToast('Ingresa un número válido de unidades residenciales', 'info');
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const selectedOrg = availableOrgs.find(o => o.id === formData.organizationId);
      const cleanName = normalizeWhitespace(formData.name);

      const safeSlug = cleanName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');
        
      const newTenant = await superAdminService.createTenant({
        name: cleanName,
        slug: safeSlug,
        subdomain: formData.subdomain || safeSlug.replace(/-/g, ''),
        nit: formData.nit.trim(),
        city: formData.city,
        address: normalizeWhitespace(formData.address) || 'Calle Principal # 10-20',
        phone: '+57 300 000 0000',
        contactEmail: normalizeEmail(formData.contactEmail),
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        adminPhone: '',
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        propertiesCount: Number(formData.propertiesCount),
        organizationId: formData.organizationId === 'DIRECT' ? undefined : formData.organizationId,
        organizationName: selectedOrg?.name,
      });

      notificationService.showToast(`¡Comunidad ${newTenant.name} dada de alta con éxito!`, 'success');
      onTenantCreated(newTenant);
      onClose();
      // Reset
      setCurrentStep(1);
      setErrors({});
      setFormData({
        name: '',
        subdomain: '',
        city: 'Cali',
        nit: '',
        address: '',
        contactEmail: '',
        organizationId: 'DIRECT',
        propertiesCount: 120,
        planId: 'plan-pro',
      });
    } catch {
      notificationService.showError('Error al crear comunidad', 'Ocurrió un problema guardando los datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-black text-white text-base">Alta de Nueva Comunidad</h2>
              <p className="text-[11px] text-slate-400">Paso {currentStep} de 2: {STEPS[currentStep - 1].name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Pills */}
        <div className="px-6 pt-4 pb-1 grid grid-cols-2 gap-2">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`py-1.5 px-2 rounded-xl text-center border transition-all ${
                s.id === currentStep
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 font-bold'
                  : s.id < currentStep
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider">{s.name}</div>
            </div>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* STEP 1: IDENTIDAD & UBICACIÓN */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <FormField
                id="tenant-name"
                label="Nombre de la Copropiedad / Condominio"
                required
                theme="dark"
                maxLength={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH}
                currentLength={formData.name.length}
                error={errors.name}
              >
                <Input
                  theme="dark"
                  type="text"
                  maxLength={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH}
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej: Altos de la Colina Club Residencial"
                  className="text-xs"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  id="tenant-nit"
                  label="NIT de la Copropiedad"
                  required
                  theme="dark"
                  error={errors.nit}
                >
                  <Input
                    theme="dark"
                    type="text"
                    inputMode="numeric"
                    maxLength={FIELD_LIMITS.NIT_MAX_LENGTH}
                    value={formData.nit}
                    onChange={(e) => {
                      clearError('nit');
                      setFormData({ ...formData, nit: formatNitInput(e.target.value) });
                    }}
                    placeholder="Ej: 901.456.789-2"
                    className="font-mono text-xs"
                  />
                </FormField>

                <FormField
                  id="tenant-city"
                  label="Ciudad"
                  required
                  theme="dark"
                >
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer text-xs"
                  >
                    {COLOMBIAN_CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField
                id="tenant-address"
                label="Dirección de la Copropiedad"
                theme="dark"
                maxLength={FIELD_LIMITS.ADDRESS_MAX_LENGTH}
                currentLength={formData.address.length}
              >
                <Input
                  theme="dark"
                  type="text"
                  autoComplete="street-address"
                  maxLength={FIELD_LIMITS.ADDRESS_MAX_LENGTH}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value.slice(0, FIELD_LIMITS.ADDRESS_MAX_LENGTH) })}
                  placeholder="Ej: Calle 100 # 15-20"
                  className="text-xs"
                />
              </FormField>
              
              <FormField
                id="tenant-email"
                label="Correo Electrónico Principal"
                required
                theme="dark"
                error={errors.contactEmail}
              >
                <Input
                  theme="dark"
                  type="email"
                  autoComplete="email"
                  maxLength={FIELD_LIMITS.EMAIL_MAX_LENGTH}
                  value={formData.contactEmail}
                  onChange={(e) => {
                    clearError('contactEmail');
                    setFormData({ ...formData, contactEmail: sanitizeEmailInput(e.target.value) });
                  }}
                  onBlur={() => {
                    if (formData.contactEmail) {
                      setFormData(prev => ({ ...prev, contactEmail: normalizeEmail(prev.contactEmail) }));
                    }
                  }}
                  placeholder="Ej: administracion@edificio.com"
                  className="text-xs"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  id="tenant-subdomain"
                  label="Subdominio Único"
                  theme="dark"
                >
                  <div className="flex items-center">
                    <input
                      id="tenant-subdomain"
                      type="text"
                      maxLength={FIELD_LIMITS.SUBDOMAIN_MAX_LENGTH}
                      value={formData.subdomain}
                      onChange={(e) => handleSubdomainChange(e.target.value)}
                      placeholder="altos-colina"
                      className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-800 rounded-l-xl border-r-0 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-mono text-[11px]"
                    />
                    <div className="h-10 flex items-center bg-slate-900 border border-slate-800 border-l-0 px-3 py-2 rounded-r-xl text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      .havita.com
                    </div>
                  </div>
                </FormField>

                <FormField
                  id="tenant-org"
                  label="Organización Gestora"
                  theme="dark"
                >
                  <select
                    value={formData.organizationId}
                    onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer text-xs"
                  >
                    <option value="DIRECT">Ninguna (Gestión Directa)</option>
                    {availableOrgs.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </FormField>
              </div>
            </div>
          )}

          {/* STEP 2: CAPACIDAD & PLAN SAAS */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-slate-300 font-bold">Selecciona el Plan SaaS *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {availablePlans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setFormData({ ...formData, planId: plan.id })}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        formData.planId === plan.id
                          ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-white text-xs">{plan.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        ${plan.pricePerUnitCOP.toLocaleString('es-CO')} /ud
                      </div>
                      <div className="mt-2 text-[10px] text-slate-500">
                        Hasta {plan.maxProperties === 10000 ? 'Ilimitadas' : plan.maxProperties} uds
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Summary Card */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-[11px]">
                <div className="font-bold text-slate-300">Resumen de Activación:</div>
                <div className="text-slate-400">
                    <strong>{formData.name || 'Sin nombre'}</strong> ({formData.city})
                </div>
                <div className="text-slate-400">
                    Plan Seleccionado: <strong>{selectedPlan.name}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/50">
          {currentStep > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-1 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Anterior
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 2 ? (
            <Button
              size="sm"
              onClick={handleNext}
              className="bg-[var(--tenant-primary)] hover:bg-blue-600 text-white flex items-center gap-1 text-xs font-bold"
            >
              Continuar <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 text-xs font-bold"
            >
              {isSubmitting ? (
                'Activando...'
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" /> Activar Comunidad
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

