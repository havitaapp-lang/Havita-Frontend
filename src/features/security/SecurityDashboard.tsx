import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { ShieldCheck, Package, UserCheck, CheckCircle, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useTenant } from '../../contexts/TenantContext';
import { Link } from 'react-router-dom';
import { GuardShiftWidget } from './components/GuardShiftWidget';

export const SecurityDashboard = () => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id || 'tenant-limonar';
  const { visitors, packages, properties, createVisitor, createPackage, recordVisitorExit, markPackageDelivered } = useData();

  const tenantVisitors = visitors.filter(v => (v.tenantId || 'tenant-limonar') === tenantId);
  const tenantPackages = packages.filter(p => (p.tenantId || 'tenant-limonar') === tenantId);
  const tenantProperties = properties.filter(p => (p.tenantId || 'tenant-limonar') === tenantId);

  const getPropLabel = (p: (typeof tenantProperties)[0]) => (p.path ? p.path.replace(' -> ', ' - ') : p.name);
  const defaultProperty = tenantProperties[0] ? getPropLabel(tenantProperties[0]) : 'Torre 1 - 101';
  const defaultPackageProp = tenantProperties[1] ? getPropLabel(tenantProperties[1]) : defaultProperty;

  const [quickVisitorModal, setQuickVisitorModal] = useState(false);
  const [visitorForm, setVisitorForm] = useState({
    name: '',
    documentId: '',
    propertyId: defaultProperty,
    vehiclePlate: '',
    observations: 'Ingreso directo por portería'
  });

  const [quickPackageModal, setQuickPackageModal] = useState(false);
  const [packageForm, setPackageForm] = useState({
    recipientName: '',
    propertyId: defaultPackageProp,
    company: 'Mercado Libre',
    trackingNumber: '',
    observations: 'Sobre / paquete pequeño'
  });

  const activeVisitors = tenantVisitors.filter(v => v.status === 'ENTERED');
  const expectedVisitors = tenantVisitors.filter(v => v.status === 'APPROVED');
  const pendingPackages = tenantPackages.filter(p => p.status !== 'DELIVERED');

  const handleCreateVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    createVisitor({
      ...visitorForm,
      status: 'ENTERED',
      enteredAt: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tenantId
    });
    setQuickVisitorModal(false);
    setVisitorForm({ name: '', documentId: '', propertyId: defaultProperty, vehiclePlate: '', observations: 'Ingreso directo por portería' });
  };

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    createPackage({
      ...packageForm,
      status: 'RECEIVED',
      tenantId
    });
    setQuickPackageModal(false);
    setPackageForm({ recipientName: '', propertyId: defaultPackageProp, company: 'Mercado Libre', trackingNumber: '', observations: 'Sobre / paquete pequeño' });
  };

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

      {/* Main Touch Buttons (Optimized for tablets) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button 
          onClick={() => setQuickVisitorModal(true)}
          className="flex items-center gap-4 p-5 sm:p-6 bg-[var(--tenant-primary)] hover:bg-blue-600 transition-all active:scale-[0.98] rounded-2xl shadow-md text-white text-left group"
        >
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <UserCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black">Registrar Ingreso de Visitante</h3>
            <p className="text-blue-100 text-xs sm:text-sm mt-0.5">Ingreso con cédula, contratista o vehículo</p>
          </div>
        </button>

        <button 
          onClick={() => setQuickPackageModal(true)}
          className="flex items-center gap-4 p-5 sm:p-6 bg-slate-900 hover:bg-slate-800 transition-all active:scale-[0.98] rounded-2xl shadow-md text-white text-left group"
        >
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Package className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black">Recibir Encomienda</h3>
            <p className="text-slate-300 text-xs sm:text-sm mt-0.5">Mercado Libre, Amazon, correspondencia</p>
          </div>
        </button>
      </div>

      {/* Active Monitoring Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Visitors Panel */}
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden bg-white flex flex-col justify-between">
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
                      Destino: <strong>{vis.propertyId}</strong> · C.C. {vis.documentId}
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

        {/* Packages Panel */}
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden bg-white flex flex-col justify-between">
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
                      Apto: <strong>{pkg.propertyId}</strong> · {pkg.company}
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

      {/* QUICK VISITOR MODAL */}
      {quickVisitorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[var(--tenant-primary)]" />
                Registrar Ingreso en Portería
              </h3>
              <button onClick={() => setQuickVisitorModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVisitor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre completo del visitante</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Carlos Pérez"
                  value={visitorForm.name}
                  onChange={(e) => setVisitorForm({ ...visitorForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cédula / Documento</label>
                  <input
                    type="text"
                    required
                    placeholder="1098234122"
                    value={visitorForm.documentId}
                    onChange={(e) => setVisitorForm({ ...visitorForm, documentId: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Apartamento destino</label>
                  <select
                    value={visitorForm.propertyId}
                    onChange={(e) => setVisitorForm({ ...visitorForm, propertyId: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  >
                    {tenantProperties.map((p) => {
                      const label = getPropLabel(p);
                      return (
                        <option key={p.id} value={label}>
                          {label} {p.residentName ? `· ${p.residentName}` : ''}
                        </option>
                      );
                    })}
                    {tenantProperties.length === 0 && <option value="Torre 1 - 101">Torre 1 - 101</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Placa de Vehículo (Si aplica)</label>
                <input
                  type="text"
                  placeholder="XYZ-123"
                  value={visitorForm.vehiclePlate}
                  onChange={(e) => setVisitorForm({ ...visitorForm, vehiclePlate: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setQuickVisitorModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[var(--tenant-primary)] hover:bg-blue-600 text-white text-sm font-semibold shadow-sm"
                >
                  Confirmar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK PACKAGE MODAL */}
      {quickPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" />
                Recibir Encomienda en Portería
              </h3>
              <button onClick={() => setQuickPackageModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePackage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destinatario (Residente)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sebastián Gómez"
                  value={packageForm.recipientName}
                  onChange={(e) => setPackageForm({ ...packageForm, recipientName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Apartamento / Unidad</label>
                  <select
                    value={packageForm.propertyId}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      const selectedProp = tenantProperties.find((p) => getPropLabel(p) === selectedVal);
                      setPackageForm({
                        ...packageForm,
                        propertyId: selectedVal,
                        recipientName: selectedProp?.residentName || packageForm.recipientName,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  >
                    {tenantProperties.map((p) => {
                      const label = getPropLabel(p);
                      return (
                        <option key={p.id} value={label}>
                          {label} {p.residentName ? `· ${p.residentName}` : ''}
                        </option>
                      );
                    })}
                    {tenantProperties.length === 0 && <option value="Torre 2 - 504">Torre 2 - 504</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transportadora</label>
                  <select
                    value={packageForm.company}
                    onChange={(e) => setPackageForm({ ...packageForm, company: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Mercado Libre">Mercado Libre</option>
                    <option value="Amazon">Amazon</option>
                    <option value="Servientrega">Servientrega</option>
                    <option value="Coordinadora">Coordinadora</option>
                    <option value="DHL">DHL</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones</label>
                <input
                  type="text"
                  placeholder="Ej. Caja sellada con cinta frágil"
                  value={packageForm.observations}
                  onChange={(e) => setPackageForm({ ...packageForm, observations: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setQuickPackageModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-sm"
                >
                  Registrar Paquete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};


