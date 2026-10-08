import { useState, useEffect } from 'react';
import { CreditCard, Search, Layers, ShieldAlert, RotateCcw, Ban, X } from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import { notificationService } from '../../services/notificationService';
import type { SaaSSubscription, SubscriptionStatus } from '../../types/superAdmin';

export const SubscriptionsPage = () => {
  const [subscriptions, setSubscriptions] = useState<SaaSSubscription[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [availablePlans, setAvailablePlans] = useState<Array<{ id: string; name: string; tagline: string; basePriceCOP: number }>>([]);

  // Modals state
  const [changingPlanSub, setChangingPlanSub] = useState<SaaSSubscription | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('plan-pro');
  const [suspendingSub, setSuspendingSub] = useState<SaaSSubscription | null>(null);
  const [suspendReason, setSuspendReason] = useState('Mora en el pago de suscripción mensual');

  const loadSubscriptions = () => {
    superAdminService.getSubscriptions().then(setSubscriptions);
  };

  useEffect(() => {
    loadSubscriptions();
    superAdminService.getPlans().then(plans => setAvailablePlans(plans.map(p => ({ id: p.id, name: p.name, tagline: p.tagline, basePriceCOP: p.basePriceCOP }))));
  }, []);

  // Action: Cambiar Plan
  const handleConfirmChangePlan = async () => {
    if (!changingPlanSub) return;
    await superAdminService.changeSubscriptionPlan(changingPlanSub.id, selectedPlanId);
    notificationService.showToast(`Plan actualizado para ${changingPlanSub.tenantName}`, 'success');
    setChangingPlanSub(null);
    loadSubscriptions();
  };

  // Action: Suspender
  const handleConfirmSuspend = async () => {
    if (!suspendingSub) return;
    await superAdminService.updateSubscriptionStatus(suspendingSub.id, 'SUSPENDED');
    notificationService.showToast(`Suscripción de ${suspendingSub.tenantName} suspendida`, 'info');
    setSuspendingSub(null);
    loadSubscriptions();
  };

  // Action: Reactivar
  const handleReactivate = async (sub: SaaSSubscription) => {
    const confirmed = await notificationService.showConfirm(
      '¿Reactivar Suscripción?',
      `¿Deseas reactivar la suscripción para ${sub.tenantName}?`,
      'Sí, reactivar',
      'Cancelar'
    );
    if (confirmed) {
      await superAdminService.updateSubscriptionStatus(sub.id, 'ACTIVE');
      notificationService.showToast(`Suscripción de ${sub.tenantName} reactivada`, 'success');
      loadSubscriptions();
    }
  };

  // Action: Cancelar
  const handleCancel = async (sub: SaaSSubscription) => {
    const confirmed = await notificationService.showConfirm(
      '¿Cancelar Suscripción?',
      `¿Estás seguro de cancelar definitivamente la suscripción de ${sub.tenantName}?`,
      'Sí, cancelar',
      'Volver'
    );
    if (confirmed) {
      await superAdminService.updateSubscriptionStatus(sub.id, 'CANCELLED');
      notificationService.showToast(`Suscripción de ${sub.tenantName} cancelada`, 'info');
      loadSubscriptions();
    }
  };

  const filteredSubs = subscriptions.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = s.tenantName.toLowerCase().includes(q) || s.planName.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>;
      case 'TRIAL':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">TRIAL</span>;
      case 'PAST_DUE':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">PAST_DUE</span>;
      case 'SUSPENDED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">SUSPENDED</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">CANCELLED</span>;
      case 'EXPIRED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">EXPIRED</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-800">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-emerald-400" />
          Suscripciones SaaS
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Control de planes vigentes, cobros de licencias de software y vencimientos por copropiedad.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="TRIAL">TRIAL</option>
            <option value="PAST_DUE">PAST_DUE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por comunidad o plan..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Subscriptions Table (Requerimiento 12 exacto) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Comunidad</th>
                <th className="py-3.5 px-4">Plan</th>
                <th className="py-3.5 px-4">Precio</th>
                <th className="py-3.5 px-4">Periodicidad</th>
                <th className="py-3.5 px-4">Inicio</th>
                <th className="py-3.5 px-4">Vencimiento</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSubs.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Comunidad */}
                  <td className="py-3 px-4 font-bold text-white">
                    {sub.tenantName}
                  </td>

                  {/* Plan */}
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                      {sub.planName}
                    </span>
                  </td>

                  {/* Precio */}
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    ${sub.priceCOP.toLocaleString('es-CO')} COP
                  </td>

                  {/* Periodicidad */}
                  <td className="py-3 px-4 text-slate-400">
                    {sub.billingCycle === 'ANNUAL' ? 'Anual' : 'Mensual'}
                  </td>

                  {/* Inicio */}
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {sub.startDate}
                  </td>

                  {/* Vencimiento */}
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {sub.expiresAt}
                  </td>

                  {/* Estado */}
                  <td className="py-3 px-4">
                    {getStatusBadge(sub.status)}
                  </td>

                  {/* Acciones: cambiar plan, suspender, reactivar, cancelar */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Cambiar plan */}
                      <button
                        onClick={() => {
                          setChangingPlanSub(sub);
                          setSelectedPlanId(sub.planId);
                        }}
                        className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Cambiar plan"
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>

                      {/* Suspender o Reactivar */}
                      {sub.status === 'SUSPENDED' ? (
                        <button
                          onClick={() => handleReactivate(sub)}
                          className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Reactivar suscripción"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setSuspendingSub(sub)}
                          className="p-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Suspender suscripción"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Cancelar */}
                      {sub.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleCancel(sub)}
                          className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Cancelar suscripción"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSubs.length === 0 && (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <p className="font-bold text-slate-200">No se encontraron suscripciones con ese criterio.</p>
          </div>
        )}
      </div>

      {/* Change Plan Modal */}
      {changingPlanSub && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Cambiar Plan: {changingPlanSub.tenantName}
              </h3>
              <button onClick={() => setChangingPlanSub(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {availablePlans.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedPlanId === p.id
                      ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex justify-between font-bold text-white">
                    <span>{p.name}</span>
                    <span className="font-mono text-emerald-400">${p.basePriceCOP.toLocaleString('es-CO')} COP</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{p.tagline}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setChangingPlanSub(null)}
                className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmChangePlan}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs"
              >
                Confirmar Cambio de Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendingSub && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-white text-base flex items-center gap-2 text-amber-400">
                <ShieldAlert className="w-4 h-4" />
                Suspender Suscripción
              </h3>
              <button onClick={() => setSuspendingSub(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              ¿Deseas suspender temporalmente la suscripción de <strong>{suspendingSub.tenantName}</strong>?
            </p>

            <div className="space-y-1 text-xs">
              <label className="block text-slate-300 font-bold">Motivo</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSuspendingSub(null)}
                className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSuspend}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs"
              >
                Confirmar Suspensión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
