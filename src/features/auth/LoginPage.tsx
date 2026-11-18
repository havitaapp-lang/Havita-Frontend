import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { 
  Building2, ShieldCheck, User, Eye, EyeOff, Lock, 
  Mail, MapPin, AlertCircle, ArrowRight, MessageCircle, 
  Sparkles, CheckCircle2, Smartphone, Volume2
} from 'lucide-react';
import { loginSchema } from '../../validation/schemas/loginSchema';
import { validateForm } from '../../validation/validators/formValidator';
import { FormErrorSummary } from '../../components/ui/FormErrorSummary';
import { FormField } from '../../components/ui/FormField';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { notificationService } from '../../services/notificationService';
import { normalizeEmail, sanitizeEmailInput } from '../../utils/sanitizers';
import { consumeReturnTo } from './returnTo';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import { Logo } from '../../components/Logo';
import { InstallAppButton } from '../pwa/InstallAppButton';

export const LoginPage = () => {
  const { login } = useAuth();
  const { currentTenant, availableTenants, setCurrentTenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  // Remember me persistence
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('havita_remember_me') === 'true';
  });

  const [formData, setFormData] = useState({
    email: localStorage.getItem('havita_remember_email') || '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ field: string; message: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isRevoked = (location.state as { reason?: string } | null)?.reason === 'access_revoked';
  const isPasswordChanged = (location.state as { reason?: string } | null)?.reason === 'password_changed';

  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

      // Save or remove remember me
      if (rememberMe) {
        localStorage.setItem('havita_remember_me', 'true');
        localStorage.setItem('havita_remember_email', cleanedData.email);
      } else {
        localStorage.removeItem('havita_remember_me');
        localStorage.removeItem('havita_remember_email');
      }

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
        // P8-B: si llegó desde un aviso de llamada con la sesión vencida, vuelve a esa llamada.
        navigate(consumeReturnTo(logged.role) ?? '/resident');
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

  // Corporate brand primary or tenant primary
  const primaryColor = currentTenant?.primaryColor || '#16345F';
  const tenantDisplayName = currentTenant?.name || 'Havita';
  const tenantDisplayAddress = currentTenant?.address 
    ? `${currentTenant.address} • ${currentTenant.city || 'Colombia'}` 
    : 'Portal Residencial de Propiedad Horizontal';

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0B192C] lg:bg-slate-50 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* ================= LEFT COLUMN: Atmospheric Brand Experience (Desktop Only) ================= */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 bg-gradient-to-br from-[#0B192C] via-[#0F172A] to-[#16345F] p-10 xl:p-16 flex-col justify-between relative overflow-hidden text-white select-none">
        
        {/* Soft Ambient Radial Lights */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Logo & Portal Tag */}
        <div className="relative z-10 flex items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-2.5 hover:opacity-95 transition-opacity">
            <Logo size="md" className="brightness-0 invert" />
          </Link>
          <div className="h-4 w-px bg-slate-700/80 mx-1" />
          <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
            Portal Residencial
          </span>
        </div>

        {/* Middle: Brand Pitch & Live Community Glassmorphism Card */}
        <div className="relative z-10 max-w-lg my-auto py-8">
          
          {/* Verified Community Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{currentTenant?.name ? `Comunidad: ${currentTenant.name}` : 'Conexión Segura Multicopropiedad'}</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-black text-white leading-tight mb-4 tracking-tight">
            Tu comunidad residencial, más simple, segura y conectada.
          </h1>

          <p className="text-sm xl:text-base text-slate-300 leading-relaxed mb-8 font-normal">
            Ingresa para gestionar visitas con código QR, responder citofonía virtual WebRTC en la nube y participar en asambleas bajo la Ley 675.
          </p>

          {/* Interactive Community Status Glass Box */}
          <div className="rounded-3xl bg-white/5 border border-white/10 p-5 xl:p-6 backdrop-blur-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-inner"
                  style={{ backgroundColor: primaryColor }}
                >
                  {currentTenant?.logo || 'HV'}
                </div>
                <div>
                  <div className="text-sm font-bold text-white truncate max-w-[220px]">
                    {tenantDisplayName}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[220px]">{tenantDisplayAddress}</span>
                  </div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Operando
              </span>
            </div>

            {/* 3 Live Feature Status Micro-Pills */}
            <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5">
                <div className="text-[10px] text-slate-400 font-medium">Citofonía</div>
                <div className="text-xs font-bold text-emerald-300 mt-0.5 flex items-center justify-center gap-1">
                  <Volume2 className="w-3 h-3" />
                  <span>WebRTC</span>
                </div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5">
                <div className="text-[10px] text-slate-400 font-medium">Accesos</div>
                <div className="text-xs font-bold text-blue-300 mt-0.5">Pases QR</div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5">
                <div className="text-[10px] text-slate-400 font-medium">Seguridad</div>
                <div className="text-xs font-bold text-cyan-300 mt-0.5">Ley 675 / 1581</div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom: Silent Security Seals */}
        <div className="relative z-10 flex items-center gap-6 text-xs text-slate-400 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cifrado SSL de 256 bits</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Aislamiento por Copropiedad</span>
          </div>
        </div>

      </div>

      {/* ================= RIGHT COLUMN: High-Fidelity Clean Authentication ================= */}
      <div className="w-full lg:w-1/2 xl:w-5/12 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 xl:p-14 bg-slate-100 lg:bg-white min-h-screen">
        
        <div className="w-full max-w-[440px] mx-auto bg-white lg:bg-transparent rounded-3xl lg:rounded-none p-6 sm:p-8 lg:p-0 shadow-xl lg:shadow-none border border-slate-200/80 lg:border-none">
          
          {/* Mobile Only Header */}
          <div className="lg:hidden flex flex-col items-center text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2 mb-3">
              <Logo size="md" />
            </Link>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-2">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{tenantDisplayName}</span>
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-6 lg:mb-8 text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-[#16345F] tracking-tight">
              Iniciar Sesión
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Ingresa tus credenciales autorizadas para acceder al portal.
            </p>
          </div>

          {/* Tenant Switcher (If multiple available in evaluation mode) */}
          {availableTenants.length > 1 && (
            <div className="mb-5 p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-xs text-slate-500 font-medium truncate">Copropiedad:</span>
              </div>
              <select
                value={currentTenant?.id || availableTenants[0].id}
                onChange={(e) => {
                  const sel = availableTenants.find((t) => t.id === e.target.value);
                  if (sel) setCurrentTenant(sel);
                }}
                className="bg-transparent border-none outline-none cursor-pointer font-bold text-xs text-[#16345F] text-right"
              >
                {availableTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Special State Alerts */}
          {isRevoked && (
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-center gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold block">Acceso Revocado</span>
                <span>Tu relación con esta copropiedad ha sido finalizada. Tu sesión se cerró automáticamente.</span>
              </div>
            </div>
          )}

          {isPasswordChanged && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center gap-3 animate-in fade-in">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block">Contraseña actualizada</span>
                <span>Tu contraseña fue cambiada exitosamente. Por favor inicia sesión nuevamente.</span>
              </div>
            </div>
          )}

          {authError && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold block">Error de autenticación</span>
                <span>{authError}</span>
              </div>
            </div>
          )}

          <FormErrorSummary errors={errorList} />

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
            
            {/* Email Field */}
            <FormField
              id="email"
              label="Correo electrónico"
              required
              error={errors.email}
            >
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username email"
                  inputMode="email"
                  maxLength={FIELD_LIMITS.EMAIL_MAX_LENGTH}
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: sanitizeEmailInput(e.target.value) });
                    if (errors.email) setErrors({ ...errors, email: '' });
                    if (authError) setAuthError(null);
                  }}
                  placeholder="ejemplo@micopropiedad.com"
                  aria-invalid={Boolean(errors.email)}
                  className={`w-full h-12 pl-10 pr-4 text-sm rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all ${
                    errors.email
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
                      : 'border-slate-200 focus:border-[#16345F] focus:ring-[#16345F]/10'
                  }`}
                />
              </div>
            </FormField>

            {/* Password Field */}
            <FormField
              id="password"
              label="Contraseña"
              required
              error={errors.password}
            >
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  maxLength={FIELD_LIMITS.PASSWORD_MAX_LENGTH}
                  value={formData.password}
                  onKeyDown={handlePasswordKeyDown}
                  onKeyUp={handlePasswordKeyDown}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password) setErrors({ ...errors, password: '' });
                    if (authError) setAuthError(null);
                  }}
                  placeholder="••••••••"
                  aria-invalid={Boolean(errors.password)}
                  className={`w-full h-12 pl-10 pr-11 text-sm rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all ${
                    errors.password
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
                      : 'border-slate-200 focus:border-[#16345F] focus:ring-[#16345F]/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* CapsLock Warning Badge */}
              {capsLockActive && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold mt-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Bloqueo de Mayúsculas (Caps Lock) está activado</span>
                </div>
              )}
            </FormField>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between pt-1 pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#16345F] focus:ring-[#16345F]/20 cursor-pointer accent-[#16345F]"
                />
                <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                  Recordarme
                </span>
              </label>

              <button 
                type="button" 
                onClick={() => navigate('/forgot-password')} 
                className="text-xs font-bold text-[#16345F] hover:text-blue-700 hover:underline transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Submit Button */}
            <SubmitButton
              isSubmitting={isSubmitting}
              loadingText="Verificando credenciales..."
              className="w-full h-12 rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-white flex justify-center items-center gap-2 bg-[#16345F] hover:bg-blue-700 active:bg-blue-800 border-none cursor-pointer"
            >
              <span>Ingresar al Sistema</span>
              <ArrowRight className="w-4 h-4" />
            </SubmitButton>
          </form>

          {/* Instalar la app (solo móviles y tablets, nunca dentro de la app instalada) */}
          <InstallAppButton className="mt-3" />

          {/* Support and Trust Footer */}
          <div className="pt-6 mt-6 border-t border-slate-100 text-center space-y-2.5">
            <p className="text-xs text-slate-500">
              ¿Problemas para acceder a tu unidad?{' '}
              <a
                href="https://wa.me/573001234567?text=Hola%2C%20tengo%20problemas%20para%20ingresar%20a%20mi%20cuenta%20en%20Havita."
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Soporte por WhatsApp
              </a>
            </p>
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Conexión segura SSL · Protección de datos Ley 1581</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
