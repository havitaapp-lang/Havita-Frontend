import { useState } from 'react';
import { Settings, Globe, Palette, Upload, Check, Building2, Clock, DollarSign, Save } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import { normalizeEmail, sanitizeEmailInput, normalizeWhitespace } from '../../utils/sanitizers';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GlobalSettingsPage = () => {
  const [settings, setSettings] = useState({
    platformName: 'Havita',
    supportEmail: 'soporte@havita.co',
    defaultCountry: 'CO',
    defaultCurrency: 'COP',
    defaultTimezone: 'America/Bogota',
    defaultLocale: 'es-CO',
    themeMode: 'dark',
    accentColor: 'var(--tenant-primary)',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const cleanName = normalizeWhitespace(settings.platformName);
    const cleanEmail = normalizeEmail(settings.supportEmail);

    if (!cleanName || cleanName.length < 2) {
      errs.platformName = 'El nombre de la plataforma es obligatorio.';
    }
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      errs.supportEmail = 'Ingresa un correo electrónico válido.';
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setSettings((prev) => ({ ...prev, platformName: cleanName, supportEmail: cleanEmail }));
    setSaved(true);
    notificationService.showToast('Configuración global de la plataforma guardada', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-3 border-b border-slate-800 space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" />
          Configuración Global de la Plataforma
        </h1>
        <p className="text-xs text-slate-400">
          Parámetros globales indispensables de identidad, localización y apariencia del SaaS Havita.
        </p>
      </div>

      <form onSubmit={handleSave} noValidate className="space-y-6 text-xs">
        {/* Identidad y Branding */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-5 shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Building2 className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Identidad & Branding</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="global-platform-name"
              label="Nombre de la Plataforma SaaS"
              required
              theme="dark"
              maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
              currentLength={settings.platformName.length}
              error={errors.platformName}
              helperText="Nombre visible en headers, correos y portales globales."
            >
              <Input
                theme="dark"
                type="text"
                maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                value={settings.platformName}
                onChange={(e) => {
                  setErrors((prev) => ({ ...prev, platformName: '' }));
                  setSettings({ ...settings, platformName: e.target.value.slice(0, FIELD_LIMITS.NAME_MAX_LENGTH) });
                }}
                placeholder="Havita"
              />
            </FormField>

            <FormField
              id="global-support-email"
              label="Correo de Notificaciones del Sistema"
              required
              theme="dark"
              error={errors.supportEmail}
              helperText="Dirección remitente para avisos transaccionales del backoffice."
            >
              <Input
                theme="dark"
                type="email"
                autoComplete="email"
                maxLength={FIELD_LIMITS.EMAIL_MAX_LENGTH}
                value={settings.supportEmail}
                onChange={(e) => {
                  setErrors((prev) => ({ ...prev, supportEmail: '' }));
                  setSettings({ ...settings, supportEmail: sanitizeEmailInput(e.target.value) });
                }}
                onBlur={() => {
                  if (settings.supportEmail) {
                    setSettings((prev) => ({ ...prev, supportEmail: normalizeEmail(prev.supportEmail) }));
                  }
                }}
                placeholder="soporte@havita.co"
              />
            </FormField>
          </div>

          {/* Logo preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">Logotipo Principal</label>
              <div className="flex items-center gap-4 p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-black text-blue-400 text-lg">
                  AU
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-white">logo_havita_dark.svg</p>
                  <p className="text-[10px] text-slate-500">Recomendado SVG o PNG transparente (240x60px)</p>
                </div>
                <button
                  type="button"
                  onClick={() => notificationService.showToast('Selector de archivo simulado', 'info')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Cambiar
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">Favicon / Isotipo</label>
              <div className="flex items-center gap-4 p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <span className="w-6 h-6 rounded-lg bg-[var(--tenant-primary)] flex items-center justify-center text-[11px] font-black text-white">AU</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-white">favicon-32x32.png</p>
                  <p className="text-[10px] text-slate-500">Formato cuadrado ICO o PNG (32x32px)</p>
                </div>
                <button
                  type="button"
                  onClick={() => notificationService.showToast('Selector de archivo simulado', 'info')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Cambiar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Localización & Moneda */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-5 shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Globe className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Localización & Moneda Predeterminada</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Idioma & Región
              </label>
              <select
                value={settings.defaultLocale}
                onChange={(e) => setSettings({ ...settings, defaultLocale: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="es-CO">Español (Colombia - es-CO)</option>
                <option value="es-MX">Español (México - es-MX)</option>
                <option value="es-CL">Español (Chile - es-CL)</option>
                <option value="en-US">English (United States - en-US)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Zona Horaria Predeterminada
              </label>
              <select
                value={settings.defaultTimezone}
                onChange={(e) => setSettings({ ...settings, defaultTimezone: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-blue-500 focus:outline-none transition-colors font-mono"
              >
                <option value="America/Bogota">America/Bogota (UTC-5)</option>
                <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                <option value="America/Santiago">America/Santiago (UTC-4)</option>
                <option value="America/Lima">America/Lima (UTC-5)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Moneda Base del SaaS
              </label>
              <select
                value={settings.defaultCurrency}
                onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:border-blue-500 focus:outline-none transition-colors font-mono"
              >
                <option value="COP">COP — Peso Colombiano ($)</option>
                <option value="MXN">MXN — Peso Mexicano ($)</option>
                <option value="USD">USD — Dólar Americano ($)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Apariencia & Tema */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-5 shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Palette className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Apariencia & Visualización</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-bold mb-2">Tema de Interfaz de Super Admin</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, themeMode: 'dark' })}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    settings.themeMode === 'dark'
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="font-bold text-xs flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"></span>
                    Modo Oscuro
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Paleta nocturna de alta concentración y contraste.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, themeMode: 'system' })}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    settings.themeMode === 'system'
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="font-bold text-xs flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                    Automático
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Sincronizado con la preferencia del sistema operativo.</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-2">Color Primario de Acento</label>
              <div className="flex items-center gap-3 pt-1">
                {[
                  { name: 'Azul Eléctrico (Havita)', hex: 'var(--tenant-primary)' },
                  { name: 'Índigo', hex: '#6366F1' },
                  { name: 'Esmeralda', hex: '#10B981' },
                  { name: 'Violeta', hex: '#8B5CF6' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSettings({ ...settings, accentColor: c.hex })}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      settings.accentColor === c.hex ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {settings.accentColor === c.hex && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-3">Color principal para botones primarios, badges de foco e indicadores de estado activo.</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer text-xs active:scale-95"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Ajustes Guardados' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
};
