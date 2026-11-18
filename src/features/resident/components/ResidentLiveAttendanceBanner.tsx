import { useRef, useState } from 'react';
import { CheckCircle2, Users } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { assemblyService, myAttendanceUnitsKey, type MyAttendanceUnit } from '../../assemblies/services/assemblyService';
import { notificationService } from '../../../services/notificationService';

/**
 * Fase 2 / E5 — asistencia por varias unidades. Las unidades, su estado (registrada, pendiente, no habilitada y por
 * qué) y el derecho a registrarla vienen del backend (GET /assemblies/{id}/my-attendance-units), que aplica las mismas
 * reglas que el registro. Cada unidad se registra con su propio propertyId explícito, sin cambiar la unidad activa del
 * portal (useActiveUnit no se toca) y sin reenviar nunca la escritura a otra unidad si el backend la rechaza.
 */
export const ResidentLiveAttendanceBanner = () => {
  const queryClient = useQueryClient();
  const inFlight = useRef(new Set<string>());
  const [busy, setBusy] = useState<string | null>(null);

  // Asamblea en curso — se actualiza por SSE (ASSEMBLY_STARTED / ASSEMBLY_ENDED).
  const { data: activeAssembly } = useQuery({
    queryKey: ['activeAssembly'],
    queryFn: () => assemblyService.getActiveAssembly(),
  });
  const assemblyId = activeAssembly?.id;

  // Estado de asistencia de cada unidad — se actualiza por SSE (ASSEMBLY_QUORUM_UPDATED) y tras registrar.
  const { data: units, isError, isLoading } = useQuery({
    queryKey: myAttendanceUnitsKey(assemblyId ?? ''),
    queryFn: () => assemblyService.getMyAttendanceUnits(assemblyId as string),
    enabled: !!assemblyId,
    retry: false,
  });

  if (!activeAssembly || !assemblyId || isLoading) return null;

  if (isError || !units) {
    return (
      <div data-testid="attendance-error" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 mb-6">
        No se pudo consultar el estado de tu asistencia a «{activeAssembly.title}». Vuelve a intentarlo en unos segundos.
      </div>
    );
  }

  const pending = units.filter((u) => u.canRegister);
  const registered = units.filter((u) => u.registered);
  if (units.length === 0) return null;
  // Una sola unidad sin derecho de voto (p. ej. delegado al arrendatario): nada que hacer aquí, como antes.
  if (units.length === 1 && pending.length === 0 && registered.length === 0) return null;

  const register = async (unit: MyAttendanceUnit) => {
    if (inFlight.current.has(unit.propertyId)) return; // evita dobles envíos de la misma unidad
    inFlight.current.add(unit.propertyId);
    setBusy(unit.propertyId);
    try {
      await assemblyService.selfRegisterAttendee(assemblyId, unit.propertyId);
      notificationService.showToast(`Asistencia registrada para ${unit.label}`, 'success');
    } catch (err: any) {
      // Sin reintentos ni otra unidad como alternativa: se muestra el motivo y se relee el estado real.
      notificationService.showToast(err?.message || 'Error al registrar asistencia', 'error');
    } finally {
      inFlight.current.delete(unit.propertyId);
      setBusy(null);
      void queryClient.invalidateQueries({ queryKey: myAttendanceUnitsKey(assemblyId) });
      void queryClient.invalidateQueries({ queryKey: ['assemblyAttendees', assemblyId] });
    }
  };

  // Todo registrado (o sin más unidades habilitadas): confirmación compacta.
  if (pending.length === 0) {
    return (
      <div data-testid="attendance-done" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 mb-6 text-xs text-emerald-800 space-y-1">
        <p className="font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> Asistencia registrada en «{activeAssembly.title}»
        </p>
        {units.length > 1 && <UnitList units={units} busy={busy} onRegister={register} />}
      </div>
    );
  }

  // Una sola unidad pendiente y ninguna otra relevante: un solo botón, sin pasos extra.
  const single = units.length === 1 ? pending[0] : null;

  return (
    <div data-testid="attendance-banner" className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-5 shadow-lg animate-fade-in text-white mb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-100">Asamblea en Curso</span>
          </div>
          <h3 className="font-bold text-lg leading-tight mb-1">Confirma tu Asistencia</h3>
          <p className="text-blue-100 text-xs">
            {single
              ? `${activeAssembly.title}. Tienes el derecho de voto para ${single.label}. Regístrate en el quórum.`
              : `${activeAssembly.title}. Registra la asistencia de cada unidad con derecho de voto.`}
          </p>
        </div>
        {single && (
          <button
            data-testid="attendance-register"
            disabled={busy === single.propertyId}
            onClick={() => register(single)}
            className="px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-60 font-black rounded-xl text-sm flex items-center gap-2 transition-all shrink-0 shadow-sm"
          >
            Presente
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {!single && (
        <div className="mt-4 rounded-2xl bg-white text-slate-800 p-3">
          <UnitList units={units} busy={busy} onRegister={register} />
        </div>
      )}
    </div>
  );
};

const STATUS_TEXT: Record<MyAttendanceUnit['status'], string> = {
  REGISTERED: 'Registrada',
  PENDING: 'Pendiente',
  NOT_ELIGIBLE: 'No habilitada',
  CLOSED: 'Asamblea no en curso',
};

function UnitList({ units, busy, onRegister }: {
  units: MyAttendanceUnit[];
  busy: string | null;
  onRegister: (u: MyAttendanceUnit) => void;
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {units.map((u) => (
        <li key={u.propertyId} data-testid="attendance-unit" data-status={u.status} className="py-2 flex items-center gap-3 text-xs">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate">{u.label}</p>
            {u.status === 'NOT_ELIGIBLE' && u.reasonMessage && <p className="text-slate-500">{u.reasonMessage}</p>}
            {u.status === 'REGISTERED' && !u.registeredByMe && (
              <p className="text-slate-500">
                {u.representativeName
                  ? `La unidad está representada por ${u.representativeName}.`
                  : 'La asistencia de esta unidad no identifica a un representante; la administración debe asignarlo.'}
              </p>
            )}
          </div>
          {u.canRegister ? (
            <button
              data-testid="attendance-register"
              disabled={busy === u.propertyId}
              onClick={() => onRegister(u)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold disabled:opacity-60 shrink-0"
            >
              Registrar asistencia
            </button>
          ) : (
            <span
              className={`px-2 py-0.5 rounded-md font-bold shrink-0 ${
                u.status === 'REGISTERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {STATUS_TEXT[u.status]}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
