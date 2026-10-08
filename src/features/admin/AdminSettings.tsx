import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { FormField } from '../../components/ui/FormField';
import { useTenant } from '../../contexts/TenantContext';
import { CheckCircle2 } from 'lucide-react';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import { formatPhoneInput, COLOMBIAN_CITIES } from '../../utils/formatters';
import { normalizeEmail, sanitizeEmailInput, normalizeWhitespace } from '../../utils/sanitizers';

import { notificationService } from '../../services/notificationService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AdminSettings = () => {
  const { currentTenant, setCurrentTenant } = useTenant();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: currentTenant?.name || 'Limonar Parque Residencial',
    subdomain: currentTenant?.subdomain || 'limonar',
    primaryColor: currentTenant?.primaryColor || 'var(--tenant-primary)',
    secondaryColor: currentTenant?.secondaryColor || '#18B89A',
    address: currentTenant?.address || 'Cra. 50 # 12-34',
    city: currentTenant?.city || 'Cali',
    phone: currentTenant?.phone || '+57 300 123 4567',
    email: currentTenant?.email || 'admin@limonar.com',
    logo: currentTenant?.logo || 'LPR'
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const cleanName = normalizeWhitespace(formData.name);
    const cleanEmail = normalizeEmail(formData.email);

    if (!cleanName || cleanName.length < 3) {
      errs.name = 'El nombre de la copropiedad debe tener al menos 3 caracteres.';
    }
    if (cleanEmail && !EMAIL_REGEX.test(cleanEmail)) {
      errs.email = 'Ingresa un correo electrónico válido.';
    }
    if (formData.phone.trim()) {
      const digits = formData.phone.replace(/\D/g, '');
      if (digits.length < FIELD_LIMITS.PHONE_MIN_LENGTH) {
        errs.phone = 'Ingresa un teléfono válido (mínimo 7 dígitos).';
      }
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    if (currentTenant) {
      try {
        const payload = {
          name: cleanName,
          subdomain: formData.subdomain,
          logoUrl: formData.logo,
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
          address: formData.address,
          city: formData.city,
          phone: formData.phone,
          contactEmail: cleanEmail,
        };

        const { apiClient } = await import('../../api/apiClient');
        const res = await apiClient.put(`/tenants/${currentTenant.id}`, payload);
        
        if (res) {
          const updated = {
            ...currentTenant,
            ...formData,
            name: cleanName,
            email: cleanEmail,
          };
          setCurrentTenant(updated);
          setSavedSuccess(true);
          notificationService.showToast('Ajustes guardados correctamente', 'success');
          setTimeout(() => setSavedSuccess(false), 3000);
        }
      } catch (err) {
        console.error('Error actualizando configuracion:', err);
        notificationService.showToast('Error al guardar la configuración', 'error');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Configuración de la Copropiedad</h2>
        <p className="text-slate-500 text-sm">Personaliza la identidad visual, datos de contacto y preferencias operativas.</p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>¡Ajustes y colores guardados exitosamente! La interfaz se actualizó en tiempo real.</span>
        </div>
      )}



      <Card className="border border-slate-200/80 rounded-2xl shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-base font-bold text-slate-900">Identidad y Marca</CardTitle>
          <CardDescription className="text-xs">
            Personaliza el nombre, logo y paleta cromática de la unidad.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          
          <form onSubmit={handleSave} noValidate>
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              
              {/* Form inputs */}
              <div className="flex-1 space-y-4 w-full">
                
                <FormField
                  id="name"
                  label="Nombre de la Copropiedad"
                  required
                  maxLength={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH}
                  currentLength={formData.name.length}
                  error={errors.name}
                >
                  <Input 
                    id="name" 
                    maxLength={FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH}
                    value={formData.name}
                    onChange={(e) => {
                      setErrors((prev) => ({ ...prev, name: '' }));
                      setFormData({ ...formData, name: e.target.value.slice(0, FIELD_LIMITS.RAZON_SOCIAL_MAX_LENGTH) });
                    }}
                    className="rounded-xl border-slate-200"
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField id="logo" label="Siglas / Logo Corto">
                    <Input 
                      id="logo" 
                      maxLength={6}
                      value={formData.logo}
                      onChange={(e) => setFormData({ ...formData, logo: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) })}
                      className="rounded-xl border-slate-200 font-bold"
                    />
                  </FormField>

                  <FormField id="subdomain" label="Subdominio">
                    <div className="flex items-center">
                      <Input 
                        id="subdomain" 
                        maxLength={FIELD_LIMITS.SUBDOMAIN_MAX_LENGTH}
                        value={formData.subdomain}
                        onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, FIELD_LIMITS.SUBDOMAIN_MAX_LENGTH) })}
                        className="rounded-l-xl rounded-r-none border-slate-200 font-mono text-xs" 
                      />
                      <span className="bg-slate-100 border border-l-0 border-slate-200 px-2.5 py-2 h-10 flex items-center rounded-r-xl text-xs text-slate-500 font-mono">
                        .havita.com
                      </span>
                    </div>
                  </FormField>
                </div>

                {/* Color pickers */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold text-slate-700">Color Primario</Label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color" 
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                      />
                      <Input 
                        type="text" 
                        maxLength={7}
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value.slice(0, 7) })}
                        className="font-mono text-xs uppercase rounded-xl border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold text-slate-700">Color Secundario</Label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color" 
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                      />
                      <Input 
                        type="text" 
                        maxLength={7}
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value.slice(0, 7) })}
                        className="font-mono text-xs uppercase rounded-xl border-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact info */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <FormField id="settings-city" label="Ciudad">
                    <Input 
                      id="settings-city"
                      list="settings-colombian-cities"
                      maxLength={FIELD_LIMITS.CITY_MAX_LENGTH}
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value.slice(0, FIELD_LIMITS.CITY_MAX_LENGTH) })}
                      className="rounded-xl border-slate-200 text-xs"
                    />
                  </FormField>

                  <FormField id="settings-phone" label="Teléfono Administración" error={errors.phone}>
                    <Input 
                      id="settings-phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={FIELD_LIMITS.PHONE_MAX_LENGTH}
                      value={formData.phone}
                      onChange={(e) => {
                        setErrors((prev) => ({ ...prev, phone: '' }));
                        setFormData({ ...formData, phone: formatPhoneInput(e.target.value) });
                      }}
                      className="rounded-xl border-slate-200 text-xs"
                    />
                  </FormField>
                </div>

                <datalist id="settings-colombian-cities">
                  {COLOMBIAN_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>

                <FormField id="settings-email" label="Correo Electrónico" error={errors.email}>
                  <Input 
                    id="settings-email"
                    type="email"
                    autoComplete="email"
                    maxLength={FIELD_LIMITS.EMAIL_MAX_LENGTH}
                    value={formData.email}
                    onChange={(e) => {
                      setErrors((prev) => ({ ...prev, email: '' }));
                      setFormData({ ...formData, email: sanitizeEmailInput(e.target.value) });
                    }}
                    onBlur={() => {
                      if (formData.email) {
                        setFormData((prev) => ({ ...prev, email: normalizeEmail(prev.email) }));
                      }
                    }}
                    className="rounded-xl border-slate-200 text-xs"
                  />
                </FormField>

                <div className="pt-4">
                  <Button type="submit" className="w-full sm:w-auto bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl px-6">
                    Guardar y Aplicar Cambios
                  </Button>
                </div>

              </div>

              {/* Mobile preview */}
              <div className="w-full sm:w-64 bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shrink-0">
                <p className="text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider text-center">
                  Previsualización en App
                </p>
                
                <div className="bg-white rounded-[2rem] shadow-md border-[3px] border-slate-800 h-96 overflow-hidden relative flex flex-col">
                  <div className="h-16 shrink-0 relative flex items-center px-4" style={{ backgroundColor: formData.primaryColor }}>
                    <div className="text-white">
                      <h3 className="text-xs font-bold leading-none truncate max-w-[170px]">{formData.name}</h3>
                      <p className="text-[9px] opacity-80 mt-1">Torre 2 · Apto 504</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-slate-50 p-3 flex flex-col gap-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-12 bg-white rounded-xl shadow-xs border border-slate-100 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-md" style={{ backgroundColor: formData.primaryColor, opacity: 0.3 }}></div>
                      </div>
                      <div className="h-12 bg-white rounded-xl shadow-xs border border-slate-100 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-md" style={{ backgroundColor: formData.secondaryColor, opacity: 0.3 }}></div>
                      </div>
                    </div>
                    
                    <div className="flex-1 bg-white rounded-xl shadow-xs border border-slate-100 p-2.5">
                      <div className="h-2 w-1/2 bg-slate-200 rounded-full mb-2"></div>
                      <div className="space-y-1.5">
                        <div className="h-7 bg-slate-100 rounded-md"></div>
                        <div className="h-7 bg-slate-100 rounded-md"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-10 border-t border-slate-200 bg-white flex justify-around items-center px-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: formData.primaryColor }}></div>
                    <div className="w-4 h-4 rounded-full bg-slate-200"></div>
                    <div className="w-4 h-4 rounded-full bg-slate-200"></div>
                  </div>
                </div>
              </div>

            </div>
          </form>

        </CardContent>
      </Card>

    </div>
  );
};
