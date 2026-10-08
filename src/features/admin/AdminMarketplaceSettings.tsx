import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Settings, Zap, Shield } from 'lucide-react';
import { marketplaceService } from '../../services/marketplaceService';
import { notificationService } from '../../services/notificationService';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { Skeleton } from '../../components/ui/Skeleton';

export function AdminMarketplaceSettings({ isTab = false }: { isTab?: boolean }) {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['admin-marketplace-config'],
    queryFn: marketplaceService.admin.getConfig,
  });

  const [mode, setMode] = useState<string>('AUTO_APPROVE');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [durationError, setDurationError] = useState('');

  useEffect(() => {
    if (config) {
      setMode(config.mode);
      setDurationDays(config.listingDurationDays);
    }
  }, [config]);

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => marketplaceService.admin.toggleFeature(enabled),
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketplace-config'] });
      notificationService.showToast(
        enabled ? 'Marketplace activado para esta comunidad' : 'Marketplace desactivado',
        'success',
      );
      // Forced reload to update tenant context properly
      setTimeout(() => window.location.reload(), 800);
    },
    onError: () => notificationService.showToast('No se pudo cambiar el estado del marketplace', 'error'),
  });

  const configMutation = useMutation({
    mutationFn: () => marketplaceService.admin.updateConfig({ mode, listingDurationDays: durationDays }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-marketplace-config'] });
      notificationService.showToast('Configuración guardada correctamente', 'success');
    },
    onError: () => notificationService.showToast('No se pudo guardar la configuración', 'error'),
  });

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (durationDays < 1 || durationDays > 365) {
      setDurationError('La duración debe estar entre 1 y 365 días');
      return;
    }
    setDurationError('');
    configMutation.mutate();
  };

  const isEnabled = config?.marketplaceEnabled ?? false;

  return (
    <div className={isTab ? "space-y-6 pt-4" : "p-4 sm:p-6 space-y-6"}>
      {/* Header */}
      {!isTab && (
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6" style={{ color: 'var(--tenant-primary)' }} />
            Configuración del Marketplace
          </h1>
          <p className="text-sm text-slate-500 mt-1">Administra cómo funciona el marketplace de tu comunidad</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Module toggle */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'color-mix(in srgb, var(--tenant-primary) 12%, white)' }}
              >
                <ShoppingBag className="w-6 h-6" style={{ color: 'var(--tenant-primary)' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Módulo Marketplace</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Permite a los residentes publicar y descubrir productos y servicios dentro de la comunidad.
                    </p>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => toggleMutation.mutate(!isEnabled)}
                    disabled={toggleMutation.isPending}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 shrink-0 ml-4 ${
                      isEnabled ? 'bg-green-500' : 'bg-slate-200'
                    }`}
                    role="switch"
                    aria-checked={isEnabled}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                    isEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-slate-400'}`} />
                    {isEnabled ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Config form */}
          {isEnabled && (
            <form onSubmit={handleConfigSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-6">
              <h2 className="text-base font-bold text-slate-900">Configuración de publicaciones</h2>

              {/* Moderation mode */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Modo de moderación</label>
                <div className="space-y-3">
                  {/* Auto approve */}
                  <label
                    className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      mode === 'AUTO_APPROVE'
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value="AUTO_APPROVE"
                      checked={mode === 'AUTO_APPROVE'}
                      onChange={() => setMode('AUTO_APPROVE')}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${mode === 'AUTO_APPROVE' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                        <Zap className={`w-4 h-4 ${mode === 'AUTO_APPROVE' ? 'text-blue-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Publicación automática</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Las publicaciones se hacen visibles inmediatamente después de ser creadas, sin revisión previa.
                        </p>
                      </div>
                    </div>
                  </label>

                  {/* Require approval */}
                  <label
                    className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      mode === 'REQUIRE_APPROVAL'
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value="REQUIRE_APPROVAL"
                      checked={mode === 'REQUIRE_APPROVAL'}
                      onChange={() => setMode('REQUIRE_APPROVAL')}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${mode === 'REQUIRE_APPROVAL' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                        <Shield className={`w-4 h-4 ${mode === 'REQUIRE_APPROVAL' ? 'text-amber-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Requiere aprobación</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Cada publicación debe ser revisada y aprobada por la administración antes de ser visible para la comunidad.
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label htmlFor="duration" className="block text-sm font-semibold text-slate-700 mb-1">
                  Duración de publicaciones (días)
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Las publicaciones expirarán automáticamente después de este período desde su aprobación.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    id="duration"
                    type="number"
                    value={durationDays}
                    onChange={(e) => { setDurationDays(Number(e.target.value)); setDurationError(''); }}
                    min={1}
                    max={365}
                    className={`w-32 px-3 py-2 text-sm rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 ${durationError ? 'border-red-300' : 'border-slate-200'}`}
                  />
                  <span className="text-sm text-slate-500">días</span>
                </div>
                {durationError && <p className="text-xs text-red-500 mt-1">{durationError}</p>}
                <p className="text-xs text-slate-400 mt-1">Entre 1 y 365 días. Valor recomendado: 30 días.</p>
              </div>

              {/* Save */}
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <SubmitButton isSubmitting={configMutation.isPending} loadingText="Guardando...">
                  Guardar configuración
                </SubmitButton>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
