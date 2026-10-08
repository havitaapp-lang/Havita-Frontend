import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Building2, ShieldCheck, User, Eye, EyeOff, Lock, Mail, MapPin, Package, Wrench, Calendar, AlertCircle } from 'lucide-react';
import { loginSchema } from '../../validation/schemas/loginSchema';
import { validateForm } from '../../validation/validators/formValidator';
import { FormErrorSummary } from '../../components/ui/FormErrorSummary';
import { FormField } from '../../components/ui/FormField';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { notificationService } from '../../services/notificationService';
import { normalizeEmail, sanitizeEmailInput } from '../../utils/sanitizers';
import { FIELD_LIMITS } from '../../validation/rules/limits';

export const LoginPage = () => {
  const { login, loginAs } = useAuth();
  const { currentTenant, availableTenants, setCurrentTenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ field: string; message: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const isRevoked = (location.state as { reason?: string } | null)?.reason === 'access_revoked';
  const isPasswordChanged = (location.state as { reason?: string } | null)?.reason === 'password_changed';

  const handleDemoLogin = async (role: 'COMMUNITY_ADMIN' | 'SECURITY' | 'RESIDENT') => {
    setIsSubmitting(true);
    try {
      const activeTenant = currentTenant || (availableTenants.length > 0 ? availableTenants[0] : null);
      if (!activeTenant) {
        notificationService.showError('Error', 'No hay comunidades disponibles para iniciar sesión.');
        return;
      }
      await loginAs(role, activeTenant.id, activeTenant.subdomain || activeTenant.slug);
      notificationService.showToast(`Sesión iniciada como ${role} en ${activeTenant.name}`, 'success');

      if (role === 'COMMUNITY_ADMIN') navigate('/admin');
      if (role === 'SECURITY') navigate('/security');
      if (role === 'RESIDENT') navigate('/resident');
    } catch {
      notificationService.showError('Error', 'No se pudo iniciar sesión con perfil de demostración');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Normalizar email antes de validar
    const cleanedData = {
      email: normalizeEmail(formData.email),
      password: formData.password,
    };

    const validation = validateForm(loginSchema, cleanedData);

    if (!validation.success) {
      setErrors(validation.errors);
      setErrorList(validation.errorList);
      return;
    }

    setErrors({});
    setErrorList([]);
    setAuthError(null);
    setIsSubmitting(true);

    try {
      const activeTenant = currentTenant || (availableTenants.length > 0 ? availableTenants[0] : null);
      const tenantId = activeTenant ? activeTenant.id : undefined;
      const logged = await login(cleanedData.email, cleanedData.password, tenantId);

      if (activeTenant) {
        notificationService.showToast(`Bienvenido ${logged.name} a ${activeTenant.name}`, 'success');
      } else {
        notificationService.showToast(`Bienvenido ${logged.name}`, 'success');
      }

      if (logged.role === 'SUPER_ADMIN') {
        navigate('/super-admin');
      } else if (logged.role === 'SECURITY') {
        navigate('/security');
      } else if (logged.role === 'RESIDENT') {
        navigate('/resident');
      } else {
        navigate('/admin');
      }
    } catch (err: any) {
      const msg = err?.message || 'Revisa tus credenciales e intenta nuevamente.';
      setAuthError(msg);
      notificationService.showError('Acceso denegado', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = currentTenant?.primaryColor || '#dc2626'; // Default red to match design if none set
  const themeStyle = { '--theme-color': primaryColor, '--theme-light': `${primaryColor}15` } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row items-center justify-center py-2 md:py-4 lg:py-8 px-4 sm:px-6 lg:px-8 font-sans bg-cover bg-center bg-no-repeat bg-fixed relative" style={{ backgroundImage: "url('/bg-login.jpg')", ...themeStyle }}>
      
      {/* Light overlay for readability */}
      <div className="absolute inset-0 bg-white/70 md:bg-gradient-to-r md:from-white/95 md:via-white/80 md:to-transparent backdrop-blur-sm md:backdrop-blur-none pointer-events-none" />

      <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 lg:gap-16 relative z-10">
        
        {/* Left side (Desktop only) */}
        <div className="hidden md:block w-full md:w-1/2 pr-2 lg:pr-12">
          <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-[0.8rem] lg:rounded-2xl flex items-center justify-center shadow-lg text-white font-black text-lg lg:text-2xl mb-4 lg:mb-6 bg-[var(--theme-color)]">
            {currentTenant?.logo || 'AU'}
          </div>
          <h1 className="text-3xl lg:text-5xl font-black text-slate-900 leading-tight mb-1 lg:mb-3">
            {currentTenant?.name || 'App Unidades'}
          </h1>
          <p className="text-slate-700 flex items-center gap-1.5 font-medium mb-4 lg:mb-6 text-[13px] lg:text-base">
            <MapPin className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> {currentTenant?.address ? `${currentTenant.address} • ${currentTenant.city}` : 'Colombia'}
          </p>
          <div className="w-8 lg:w-12 h-1 lg:h-1.5 rounded-full mb-4 lg:mb-6 bg-[var(--theme-color)]"></div>
          <p className="text-slate-700 lg:text-slate-600 text-[14px] lg:text-lg mb-6 lg:mb-10 leading-relaxed max-w-md font-medium">
            Tu portal residencial, más simple, seguro y conectado.
          </p>

          <div className="space-y-3 lg:space-y-6">
            <div className="flex items-center gap-3 lg:gap-5">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-[1.25rem] flex items-center justify-center shrink-0 bg-[var(--theme-light)] text-[var(--theme-color)] shadow-sm">
                <Package className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-[13px] lg:text-[15px]">Gestiona tus paquetes</h3>
                <p className="text-[11px] lg:text-sm text-slate-600 mt-0.5">Recibe y revisa tus entregas.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 lg:gap-5">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-[1.25rem] flex items-center justify-center shrink-0 bg-[var(--theme-light)] text-[var(--theme-color)] shadow-sm">
                <User className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-[13px] lg:text-[15px]">Autoriza visitas</h3>
                <p className="text-[11px] lg:text-sm text-slate-600 mt-0.5">Desde cualquier lugar.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:gap-5">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-[1.25rem] flex items-center justify-center shrink-0 bg-[var(--theme-light)] text-[var(--theme-color)] shadow-sm">
                <Wrench className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-[13px] lg:text-[15px]">Reporta daños</h3>
                <p className="text-[11px] lg:text-sm text-slate-600 mt-0.5">Mantén tu hogar en perfecto estado.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:gap-5">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-[1.25rem] flex items-center justify-center shrink-0 bg-[var(--theme-light)] text-[var(--theme-color)] shadow-sm">
                <Calendar className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-[13px] lg:text-[15px]">Reserva zonas comunes</h3>
                <p className="text-[11px] lg:text-sm text-slate-600 mt-0.5">De forma rápida y sencilla.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Header (Hidden on Desktop) */}
        <div className="md:hidden flex flex-col items-center justify-center text-center w-full mb-2">
          <div className="w-16 h-16 rounded-[1.25rem] flex items-center justify-center shadow-lg text-white font-black text-2xl mb-4 bg-[var(--theme-color)]">
            {currentTenant?.logo || 'AU'}
          </div>
          <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2 drop-shadow-sm px-2">
            {currentTenant?.name || 'App Unidades'}
          </h1>
          <p className="text-slate-800 flex items-center justify-center gap-1.5 font-bold bg-white/60 backdrop-blur-md px-4 py-1.5 rounded-full text-xs shadow-sm">
            <MapPin className="w-3.5 h-3.5" /> {currentTenant?.address ? `${currentTenant.address} • ${currentTenant.city}` : 'Colombia'}
          </p>

          {availableTenants.length > 1 && (
            <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full text-xs text-slate-800 shadow-md">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--theme-color)] shadow-sm" />
              <select
                value={currentTenant?.id || availableTenants[0].id}
                onChange={(e) => {
                  const sel = availableTenants.find((t) => t.id === e.target.value);
                  if (sel) setCurrentTenant(sel);
                }}
                className="bg-transparent border-none outline-none cursor-pointer font-bold text-slate-900"
              >
                {availableTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Card (Form) */}
        <div className="w-full max-w-[480px] md:max-w-[400px] lg:max-w-[480px] mx-auto md:mx-0 shrink-0">
          <Card className="border-0 shadow-2xl rounded-[1.5rem] lg:rounded-[2rem] bg-white overflow-hidden p-2 sm:p-4 lg:p-6">
            
            {/* Desktop only: Logo and title inside card */}
            {/* En laptops pequeñas, ocultamos esto de la tarjeta para ahorrar 150px de altura, ya que ya se ve en la columna izquierda. Solo se muestra en monitores grandes lg: */}
            <div className="hidden lg:block text-center pt-2 pb-4 px-8">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-xl mb-4 shadow-sm bg-[var(--theme-color)]">
                {currentTenant?.logo || 'AU'}
              </div>
              <h2 className="text-2xl font-black text-slate-900">{currentTenant?.name || 'App Unidades'}</h2>
              <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-2 font-medium">
                <MapPin className="w-3.5 h-3.5" /> {currentTenant?.address ? `${currentTenant.address} • ${currentTenant.city}` : 'Colombia'}
              </p>
              <div className="w-full h-px bg-slate-100 mt-6"></div>
            </div>

            <CardHeader className="pt-4 lg:pt-0 pb-4 lg:pb-6 px-4 sm:px-6 lg:px-2">
              <CardTitle className="text-xl lg:text-2xl font-black text-slate-900">Iniciar Sesión</CardTitle>
              <CardDescription className="text-xs lg:text-[13px] text-slate-500 mt-1 font-medium">
                Ingresa tus credenciales autorizadas para acceder al portal.
              </CardDescription>
            </CardHeader>

            <CardContent className="px-4 sm:px-6 lg:px-2 pb-2 space-y-4 lg:space-y-6">
              {isRevoked && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-center gap-3 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Acceso Revocado</span>
                    <span>Tu relación con esta copropiedad ha sido finalizada por el propietario. Tu sesión se cerró automáticamente.</span>
                  </div>
                </div>
              )}

              {isPasswordChanged && (
                <div className="p-3.5 bg-green-50 border border-green-200 rounded-2xl text-green-900 text-xs flex items-center gap-3 animate-in fade-in">
                  <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Contraseña actualizada</span>
                    <span>Tu contraseña fue cambiada exitosamente. Por favor inicia sesión nuevamente.</span>
                  </div>
                </div>
              )}

              {authError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Acceso Denegado</span>
                    <span>{authError}</span>
                  </div>
                </div>
              )}

              <FormErrorSummary errors={errorList} />

              <form onSubmit={handleSubmit} noValidate className="space-y-4 lg:space-y-6">
                <FormField
                  id="email"
                  label="Correo electrónico"
                  required
                  error={errors.email}
                >
                  <div className="relative">
                    <Mail className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400 absolute left-3.5 lg:left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={FIELD_LIMITS.EMAIL_MAX_LENGTH}
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: sanitizeEmailInput(e.target.value) });
                        if (errors.email) setErrors({ ...errors, email: '' });
                        if (authError) setAuthError(null);
                      }}
                      placeholder="ejemplo@condominio.com"
                      aria-invalid={Boolean(errors.email)}
                      className={`w-full pl-10 lg:pl-11 pr-4 py-2.5 lg:py-3 text-sm rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                        errors.email
                          ? 'border-rose-400 focus:ring-rose-200'
                          : 'border-slate-200 focus:border-[var(--theme-color)] focus:ring-[var(--theme-color)]/20'
                      }`}
                    />
                  </div>
                </FormField>

                <FormField
                  id="password"
                  label="Contraseña"
                  required
                  error={errors.password}
                >
                  <div className="relative">
                    <Lock className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400 absolute left-3.5 lg:left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      maxLength={FIELD_LIMITS.PASSWORD_MAX_LENGTH}
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        if (errors.password) setErrors({ ...errors, password: '' });
                        if (authError) setAuthError(null);
                      }}
                      placeholder="••••••••"
                      aria-invalid={Boolean(errors.password)}
                      className={`w-full pl-10 lg:pl-11 pr-11 py-2.5 lg:py-3 text-sm rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                        errors.password
                          ? 'border-rose-400 focus:ring-rose-200'
                          : 'border-slate-200 focus:border-[var(--theme-color)] focus:ring-[var(--theme-color)]/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" /> : <Eye className="w-4 h-4 lg:w-5 lg:h-5" />}
                    </button>
                  </div>
                </FormField>

                <div className="flex items-center justify-between pt-0 lg:pt-1 pb-1 lg:pb-2">
                  <label className="flex items-center gap-2 lg:gap-2.5 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-4 h-4 lg:w-5 lg:h-5 rounded-[4px] border-2 transition-colors border-[var(--theme-color)] bg-[var(--theme-color)]">
                      <svg className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-xs lg:text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">Recordarme</span>
                  </label>
                  <a href="#" className="text-xs lg:text-sm font-bold hover:underline text-[var(--theme-color)]">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>

                <SubmitButton
                  isSubmitting={isSubmitting}
                  loadingText="Validando..."
                  className="w-full py-2.5 lg:py-3.5 rounded-xl text-sm lg:text-[15px] font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-white flex justify-center items-center gap-2 bg-[var(--theme-color)] border-none"
                >
                  Ingresar al Sistema <span className="font-bold text-base lg:text-lg leading-none">→</span>
                </SubmitButton>
              </form>

              {/* Acceso seguro badge (Desktop only inside card) */}
              <div className="hidden lg:flex mt-8 p-4 rounded-2xl items-center gap-4 bg-[var(--theme-light)]">
                 <ShieldCheck className="w-7 h-7 shrink-0 text-[var(--theme-color)]" />
                 <div>
                   <h4 className="text-[13px] font-bold text-slate-900">Acceso seguro</h4>
                   <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Tus datos están protegidos con conexión segura y autenticación encriptada.</p>
                 </div>
              </div>

              {/* Mobile Quick Features (Mobile only) */}
              <div className="md:hidden pt-8 border-t border-slate-100 mt-8">
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  <div className="flex flex-col items-center text-center group">
                    <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center mb-2 shadow-xs bg-[var(--theme-light)] text-[var(--theme-color)]">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-black text-slate-800 leading-tight">Gestiona tus<br/>paquetes</div>
                    <div className="text-[7px] sm:text-[8px] text-slate-400 mt-1 leading-tight font-medium">Recibe y revisa<br/>tus entregas.</div>
                  </div>
                  
                  <div className="flex flex-col items-center text-center group">
                    <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center mb-2 shadow-xs bg-[var(--theme-light)] text-[var(--theme-color)]">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-black text-slate-800 leading-tight">Autoriza<br/>visitas</div>
                    <div className="text-[7px] sm:text-[8px] text-slate-400 mt-1 leading-tight font-medium">Desde<br/>cualquier lugar.</div>
                  </div>

                  <div className="flex flex-col items-center text-center group">
                    <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center mb-2 shadow-xs bg-[var(--theme-light)] text-[var(--theme-color)]">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-black text-slate-800 leading-tight">Reporta<br/>daños</div>
                    <div className="text-[7px] sm:text-[8px] text-slate-400 mt-1 leading-tight font-medium">Mantén tu hogar<br/>en perfecto estado.</div>
                  </div>

                  <div className="flex flex-col items-center text-center group">
                    <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center mb-2 shadow-xs bg-[var(--theme-light)] text-[var(--theme-color)]">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-black text-slate-800 leading-tight">Reserva<br/>zonas comunes</div>
                    <div className="text-[7px] sm:text-[8px] text-slate-400 mt-1 leading-tight font-medium">De forma rápida<br/>y sencilla.</div>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
