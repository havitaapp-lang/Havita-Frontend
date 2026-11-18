import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { ShieldCheck, Package, UserCheck, CheckCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useTenant } from '../../contexts/TenantContext';
import { Link } from 'react-router-dom';
import { GuardShiftWidget } from './components/GuardShiftWidget';

export const SecurityDashboard = () => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id || 'tenant-limonar';
  const { visitors, packages, properties, recordVisitorExit, markPackageDelivered } = useData();

  const tenantVisitors = visitors.filter(v => (v.tenantId || 'tenant-limonar') === tenantId);
  const tenantPackages = packages.filter(p => (p.tenantId || 'tenant-limonar') === tenantId);

  const getPropertyDisplay = (propertyId?: string, propertyNameFallback?: string) => {
    if (!propertyId && !propertyNameFallback) return '';
    const prop = properties.find(
      (p) =>
        p.id === propertyId ||
        String(p.id).toLowerCase() === String(propertyId).toLowerCase() ||
        p.path === propertyId ||
        p.name === propertyId
    );
    if (prop) {
      return prop.path || prop.name;
    }
    if (propertyNameFallback && propertyNameFallback.trim().length > 0) {
      return propertyNameFallback;
    }
    return propertyId || '';
  };

  const activeVisitors = tenantVisitors.filter(v => v.status === 'ENTERED');
  const expectedVisitors = tenantVisitors.filter(v => v.status === 'APPROVED');
  const pendingPackages = tenantPackages.filter(p => p.status !== 'DELIVERED');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Control Operativo de Portería</h2>
          <p className="text-slate-500 text-sm">Turno activo · Registro rápido táctil para tablets y puestos de control.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Portería Principal Conectada
          </span>
        </div>
      </div>

      {/* MI TURNO: Widget Operativo Destacado */}
      <GuardShiftWidget />

      {/* Operational Sections: Visitors & Packages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Visitors Column (Action button + Monitoring card) */}
        <div className="flex flex-col gap-4">
          <Link 
            to="/security/visitors"
            className="flex items-center gap-4 p-5 sm:p-6 bg-[var(--tenant-primary)] hover:bg-blue-600 transition-all active:scale-[0.98] rounded-2xl shadow-md text-white text-left group"
          >
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <UserCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black">Registrar Ingreso de Visitante</h3>
              <p className="text-blue-100 text-xs sm:text-sm mt-0.5">Ingreso con cédula, contratista o vehículo</p>
            </div>
          </Link>

          {/* Visitors Panel */}
          <Card className="border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden bg-white flex flex-col justify-between flex-1">
            <div>
              <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Visitantes en la Copropiedad ({activeVisitors.length})
                </CardTitle>
                <Link to="/security/visitors" className="text-xs font-semibold text-[var(--tenant-primary)] hover:underline">
                  Ver todos
                </Link>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-slate-100">
                {activeVisitors.slice(0, 4).map((vis) => (
                  <div key={vis.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{vis.name}</div>
                      <div className="text-slate-500 text-[11px]">
                        Destino: <strong>{getPropertyDisplay(vis.propertyId, vis.propertyName)}</strong> · C.C. {vis.documentId}
                      </div>
                      {vis.vehiclePlate && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-slate-100 font-mono text-[10px] text-slate-700">
                          🚗 {vis.vehiclePlate}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => recordVisitorExit(vis.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                    >
                      Dar Salida
                    </button>
                  </div>
                ))}

                {activeVisitors.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No hay visitantes registrados adentro en este momento.
                  </div>
                )}
              </CardContent>
            </div>

            {expectedVisitors.length > 0 && (
              <div className="p-3.5 bg-blue-50/60 border-t border-blue-100/80 flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-900">
                  {expectedVisitors.length} visitas pre-autorizadas por residentes
                </span>
                <Link to="/security/visitors" className="text-[var(--tenant-primary)] font-bold underline">
                  Gestionar
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Packages Column (Action button + Monitoring card) */}
        <div className="flex flex-col gap-4">
          <Link 
            to="/security/packages"
            className="flex items-center gap-4 p-5 sm:p-6 bg-slate-900 hover:bg-slate-800 transition-all active:scale-[0.98] rounded-2xl shadow-md text-white text-left group"
          >
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Package className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black">Recibir Encomienda</h3>
              <p className="text-slate-300 text-xs sm:text-sm mt-0.5">Mercado Libre, Amazon, correspondencia</p>
            </div>
          </Link>

          {/* Packages Panel */}
          <Card className="border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden bg-white flex flex-col justify-between flex-1">
            <div>
              <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-500" />
                  Paquetes por Entregar ({pendingPackages.length})
                </CardTitle>
                <Link to="/security/packages" className="text-xs font-semibold text-[var(--tenant-primary)] hover:underline">
                  Ver todos
                </Link>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-slate-100">
                {pendingPackages.slice(0, 4).map((pkg) => (
                  <div key={pkg.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{pkg.recipientName}</div>
                      <div className="text-slate-500 text-[11px]">
                        <strong className="text-slate-800">{getPropertyDisplay(pkg.propertyId, pkg.propertyName)}</strong> · {pkg.company}
                      </div>
                      <div className="text-[10px] text-slate-400">{pkg.receivedAt}</div>
                    </div>

                    <button
                      onClick={() => markPackageDelivered(pkg.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors"
                    >
                      Entregar
                    </button>
                  </div>
                ))}

                {pendingPackages.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    No hay encomiendas pendientes en portería.
                  </div>
                )}
              </CardContent>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{tenantPackages.filter(p => p.status === 'DELIVERED').length} entregados en el turno</span>
              <Link to="/security/packages" className="text-[var(--tenant-primary)] font-semibold hover:underline">
                Historial
              </Link>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};


