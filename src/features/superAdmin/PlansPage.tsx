import { useState, useEffect } from 'react';
import { Layers, Check, Building, Users, HardDrive, Edit2, X } from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import { notificationService } from '../../services/notificationService';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import { normalizeWhitespace } from '../../utils/sanitizers';
import type { Plan } from '../../types/superAdmin';

export const PlansPage = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const loadPlans = () => {
    superAdminService.getPlans().then(setPlans);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    const cleanName = normalizeWhitespace(editingPlan.name);
    if (!cleanName) {
      notificationService.showToast('El nombre del plan es obligatorio', 'info');
      return;
    }

    await superAdminService.updatePlan(editingPlan.id, {
      name: cleanName,
      tagline: normalizeWhitespace(editingPlan.tagline || ''),
      basePriceCOP: Math.max(0, Number(editingPlan.basePriceCOP)),
      pricePerUnitCOP: Math.max(0, Number(editingPlan.pricePerUnitCOP)),
      periodicity: editingPlan.periodicity,
      maxProperties: Math.max(1, Number(editingPlan.maxProperties)),
      maxAdmins: Math.max(1, Number(editingPlan.maxAdmins)),
      storageGB: Math.max(1, Number(editingPlan.storageGB)),
      status: editingPlan.status,
    });

    notificationService.showToast(`Plan ${cleanName} actualizado exitosamente`, 'success');
    setEditingPlan(null);
    loadPlans();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-800">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Layers className="w-6 h-6 text-blue-400" />
          Planes SaaS
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Estructura de planes, precios por unidad residencial, límites y funcionalidades incluidas.
        </p>
      </div>

      {/* Plans Matrix Grid (Requerimiento 11) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-slate-900/90 border rounded-3xl p-6 space-y-5 flex flex-col justify-between relative shadow-xl transition-all ${
              plan.popular
                ? 'border-blue-500/80 ring-1 ring-blue-500/50 shadow-blue-500/10'
                : 'border-slate-800'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                Plan Recomendado
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">{plan.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{plan.tagline}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {plan.status}
                </span>
              </div>

              {/* Price block */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Precio por Unidad Residencial</div>
                <div className="text-2xl font-black text-white font-mono">
                  ${plan.pricePerUnitCOP.toLocaleString('es-CO')}{' '}
                  <span className="text-xs font-normal text-slate-400">COP /mes</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Base fija: ${plan.basePriceCOP.toLocaleString('es-CO')} COP</span>
                  <span className="font-bold text-slate-300 font-mono">Periodicidad: {plan.periodicity}</span>
                </div>
              </div>

              {/* Limits */}
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Hasta <strong>{plan.maxProperties}</strong> propiedades</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Hasta <strong>{plan.maxAdmins}</strong> administradores</span>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>{plan.storageGB} GB</strong> almacenamiento</span>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Features Incluidas:
                </div>
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-300">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setEditingPlan({ ...plan })}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" /> Modificar Parámetros
            </button>
          </div>
        ))}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                Editar Plan {editingPlan.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                aria-label="Cerrar modal"
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3.5 text-xs">
              <FormField
                id="plan-name"
                label="Nombre del Plan"
                required
                theme="dark"
                maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                currentLength={editingPlan.name.length}
              >
                <Input
                  theme="dark"
                  type="text"
                  maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value.slice(0, FIELD_LIMITS.NAME_MAX_LENGTH) })}
                  required
                />
              </FormField>

              <FormField
                id="plan-tagline"
                label="Descripción corta / Tagline"
                theme="dark"
                maxLength={FIELD_LIMITS.TITLE_MAX_LENGTH}
                currentLength={(editingPlan.tagline || '').length}
              >
                <Input
                  theme="dark"
                  type="text"
                  maxLength={FIELD_LIMITS.TITLE_MAX_LENGTH}
                  value={editingPlan.tagline || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, tagline: e.target.value.slice(0, FIELD_LIMITS.TITLE_MAX_LENGTH) })}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField id="plan-price-unit" label="Precio x Unidad (COP)" required theme="dark">
                  <Input
                    theme="dark"
                    type="number"
                    min={0}
                    value={editingPlan.pricePerUnitCOP}
                    onChange={(e) => setEditingPlan({ ...editingPlan, pricePerUnitCOP: Math.max(0, Number(e.target.value)) })}
                    className="font-mono"
                    required
                  />
                </FormField>
                <FormField id="plan-base-price" label="Base Fija (COP)" required theme="dark">
                  <Input
                    theme="dark"
                    type="number"
                    min={0}
                    value={editingPlan.basePriceCOP}
                    onChange={(e) => setEditingPlan({ ...editingPlan, basePriceCOP: Math.max(0, Number(e.target.value)) })}
                    className="font-mono"
                    required
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField id="plan-periodicity" label="Periodicidad" theme="dark">
                  <select
                    value={editingPlan.periodicity}
                    onChange={(e) => setEditingPlan({ ...editingPlan, periodicity: e.target.value as 'Mensual' | 'Anual' })}
                    className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Mensual">Mensual</option>
                    <option value="Anual">Anual</option>
                  </select>
                </FormField>
                <FormField id="plan-status" label="Estado" theme="dark">
                  <select
                    value={editingPlan.status}
                    onChange={(e) => setEditingPlan({ ...editingPlan, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                    className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <FormField id="plan-max-props" label="Máx. Propiedades" theme="dark">
                  <Input
                    theme="dark"
                    type="number"
                    min={1}
                    value={editingPlan.maxProperties}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxProperties: Math.max(1, Number(e.target.value)) })}
                    className="font-mono"
                  />
                </FormField>
                <FormField id="plan-max-admins" label="Máx. Admins" theme="dark">
                  <Input
                    theme="dark"
                    type="number"
                    min={1}
                    value={editingPlan.maxAdmins}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxAdmins: Math.max(1, Number(e.target.value)) })}
                    className="font-mono"
                  />
                </FormField>
                <FormField id="plan-storage" label="Almacenamiento (GB)" theme="dark">
                  <Input
                    theme="dark"
                    type="number"
                    min={1}
                    value={editingPlan.storageGB}
                    onChange={(e) => setEditingPlan({ ...editingPlan, storageGB: Math.max(1, Number(e.target.value)) })}
                    className="font-mono"
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 cursor-pointer"
                >
                  Guardar Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
