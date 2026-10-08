import { useState, useEffect } from 'react';
import { Flag, Search } from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import { notificationService } from '../../services/notificationService';
import type { ProductFeature } from '../../types/superAdmin';

export const FeatureFlagsPage = () => {
  const [features, setFeatures] = useState<ProductFeature[]>([]);
  const [search, setSearch] = useState('');

  const loadFeatures = () => {
    superAdminService.getFeatureFlags().then(setFeatures);
  };

  useEffect(() => {
    loadFeatures();
  }, []);

  const handleToggle = async (feature: ProductFeature) => {
    const nextState = !feature.isEnabled;
    await superAdminService.toggleGlobalFeatureFlag(feature.id, nextState);
    notificationService.showToast(
      `Módulo "${feature.name}" ${nextState ? 'activado' : 'desactivado'} a nivel de plataforma`,
      'success'
    );
    loadFeatures();
  };

  const filteredFeatures = features.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Flag className="w-6 h-6 text-purple-400" />
            Features de Producto
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Administración de capacidades y módulos funcionales disponibles en la plataforma Havita.
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar módulo..."
            aria-label="Buscar módulo o feature flag"
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Simple List of Features (Requerimiento 10) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFeatures.map((feat) => (
          <div
            key={feat.id}
            className={`p-5 rounded-3xl border transition-all shadow-lg flex flex-col justify-between space-y-4 ${
              feat.isEnabled
                ? 'bg-slate-900/90 border-slate-800'
                : 'bg-slate-900/40 border-slate-800/60 opacity-75'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-white text-base">{feat.name}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    feat.isEnabled
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {feat.isEnabled ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {feat.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Estado global: {feat.isEnabled ? 'Habilitado' : 'Deshabilitado'}
              </span>

              <button
                onClick={() => handleToggle(feat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  feat.isEnabled
                    ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                    : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                }`}
              >
                {feat.isEnabled ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredFeatures.length === 0 && (
        <div className="p-8 text-center text-slate-400 space-y-2">
          <p className="font-bold text-slate-200">No se encontró ningún módulo con ese nombre.</p>
        </div>
      )}
    </div>
  );
};
