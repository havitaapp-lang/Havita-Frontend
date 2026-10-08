import React, { useState } from "react";
import {
  Car,
  PawPrint,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  CheckCircle2,
  SkipForward,
  Home,
  ShieldCheck,
  Package,
  Wrench,
  Calendar,
  Sofa,
  Sparkles,
} from "lucide-react";
import { residentSelfService } from "../../../services/residentSelfService";
import type {
  ResidentCreateVehicleDto,
  ResidentCreatePetDto,
} from "../../../services/residentSelfService";
import { notificationService } from "../../../services/notificationService";
import { FIELD_LIMITS } from "../../../validation/rules/limits";
import { formatPlateInput } from "../../../utils/formatters";

interface Props {
  userName: string;
  onClose: (completed: boolean) => void;
}

type Step = "welcome" | "vehicles" | "pets" | "tour" | "done";

const VEHICLE_TYPES = ["Automóvil", "Camioneta", "Moto", "Bicicleta", "Otro"];
const PET_TYPES = ["Perro", "Gato", "Ave", "Reptil", "Otro"];

const TOUR_FEATURES = [
  {
    icon: Home,
    title: "Inicio & Novedades",
    desc: "Tu resumen en tiempo real: paquetes pendientes, visitas activas, solicitudes y comunicados recientes.",
    color: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50 text-blue-600",
  },
  {
    icon: ShieldCheck,
    title: "Visitas & Accesos",
    desc: "Autoriza invitados con antelación, genera pases de acceso y recibe notificaciones cuando lleguen a portería.",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Package,
    title: "Paquetes & Correspondencia",
    desc: "Consulta entregas registradas en recepción con estado en vivo y retira tus encomiendas sin demoras.",
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50 text-amber-600",
  },
  {
    icon: Wrench,
    title: "PQRS & Mantenimiento",
    desc: "Reporta daños, envía peticiones a la administración y haz seguimiento continuo de la solución.",
    color: "from-rose-500 to-pink-600",
    bg: "bg-rose-50 text-rose-600",
  },
  {
    icon: Calendar,
    title: "Reservas de Zonas",
    desc: "Agenda el salón comunal, BBQ, piscina o zonas compartidas según la disponibilidad del condominio.",
    color: "from-purple-500 to-violet-600",
    bg: "bg-purple-50 text-purple-600",
  },
  {
    icon: Sofa,
    title: "Hogar (Mascotas & Vehículos)",
    desc: "Actualiza en cualquier momento tus vehículos y mascotas para el control seguro de la copropiedad.",
    color: "from-sky-500 to-blue-600",
    bg: "bg-sky-50 text-sky-600",
  },
];

export const OnboardingModal: React.FC<Props> = ({ userName, onClose }) => {
  const [step, setStep] = useState<Step>("welcome");
  const [tourIndex, setTourIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  // ─── Vehículos ───────────────────────────────────────────────────────────────
  const [vehicles, setVehicles] = useState<ResidentCreateVehicleDto[]>([]);
  const [vehicleForm, setVehicleForm] = useState<ResidentCreateVehicleDto>({
    plate: "",
    type: "Automóvil",
    brand: "",
    model: "",
    color: "",
  });

  // ─── Mascotas ────────────────────────────────────────────────────────────────
  const [pets, setPets] = useState<ResidentCreatePetDto[]>([]);
  const [petForm, setPetForm] = useState<ResidentCreatePetDto>({
    name: "",
    type: "Perro",
    breed: "",
    color: "",
    isDangerousBreed: false,
  });

  // ─── Handlers: Vehículos ─────────────────────────────────────────────────────
  const addVehicle = () => {
    if (!vehicleForm.plate?.trim()) return;
    setVehicles((prev) => [...prev, { ...vehicleForm, plate: vehicleForm.plate!.toUpperCase() }]);
    setVehicleForm({ plate: "", type: "Automóvil", brand: "", model: "", color: "" });
  };

  const removeVehicle = (idx: number) =>
    setVehicles((prev) => prev.filter((_, i) => i !== idx));

  // ─── Handlers: Mascotas ───────────────────────────────────────────────────────
  const addPet = () => {
    if (!petForm.name?.trim()) return;
    setPets((prev) => [...prev, { ...petForm }]);
    setPetForm({ name: "", type: "Perro", breed: "", color: "", isDangerousBreed: false });
  };

  const removePet = (idx: number) =>
    setPets((prev) => prev.filter((_, i) => i !== idx));

  // ─── Finalizar y Persistir ───────────────────────────────────────────────────
  const finish = async (skipAll = false) => {
    setSaving(true);
    try {
      if (!skipAll) {
        // Guardar vehículos que el residente haya agregado
        for (const v of vehicles) {
          await residentSelfService.addMyVehicle(v);
        }
        // Guardar mascotas que el residente haya agregado
        for (const p of pets) {
          await residentSelfService.addMyPet(p);
        }
      }
      // Marcar onboarding completado en BD
      await residentSelfService.completeOnboarding();

      if (!skipAll && (vehicles.length > 0 || pets.length > 0)) {
        notificationService.showToast(
          `¡Listo! Registros guardados correctamente.`,
          "success"
        );
      }
      onClose(true);
    } catch {
      // Si falla la red, marcamos igualmente para evitar bucles que bloqueen al usuario
      onClose(true);
    } finally {
      setSaving(false);
    }
  };

  const currentTourItem = TOUR_FEATURES[tourIndex];
  const TourIcon = currentTourItem.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-[var(--tenant-primary)] to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-widest opacity-80 flex items-center gap-1.5">
              {step === "welcome" && "👋 Bienvenida"}
              {step === "vehicles" && "Paso 1: Vehículos"}
              {step === "pets" && "Paso 2: Mascotas"}
              {step === "tour" && `Paso 3: Guía de la App (${tourIndex + 1}/${TOUR_FEATURES.length})`}
              {step === "done" && "🎉 Todo listo"}
            </span>
            <button
              onClick={() => finish(true)}
              className="flex items-center gap-1 text-xs opacity-75 hover:opacity-100 transition-opacity bg-white/10 px-2.5 py-1 rounded-full"
              title="Saltar todo el proceso"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Saltar todo
            </button>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {step === "welcome" && `¡Hola, ${userName}!`}
            {step === "vehicles" && "Registra tus vehículos (Opcional)"}
            {step === "pets" && "Registra tus mascotas (Opcional)"}
            {step === "tour" && "Conoce tu nuevo Portal"}
            {step === "done" && "¡Estás listo para comenzar!"}
          </h2>
          <p className="text-xs sm:text-sm opacity-85 mt-1">
            {step === "welcome" && "Te damos la bienvenida a tu portal residencial. Vamos a preparar tu cuenta."}
            {step === "vehicles" && "Si tienes auto o moto, regístralos para facilitar tu ingreso por portería."}
            {step === "pets" && "Si convives con mascotas, agrégalas aquí para el censo de la copropiedad."}
            {step === "tour" && "Un breve recorrido visual por las herramientas que tienes a tu disposición."}
            {step === "done" && "Tu cuenta está configurada y lista para usarse."}
          </p>

          {/* Progress Indicator */}
          <div className="flex gap-1.5 mt-3.5">
            <div className={`h-1.5 flex-1 rounded-full transition-all ${step === "welcome" || step === "vehicles" || step === "pets" || step === "tour" || step === "done" ? "bg-white" : "bg-white/30"}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all ${step === "vehicles" || step === "pets" || step === "tour" || step === "done" ? "bg-white" : "bg-white/30"}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all ${step === "pets" || step === "tour" || step === "done" ? "bg-white" : "bg-white/30"}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all ${step === "tour" || step === "done" ? "bg-white" : "bg-white/30"}`} />
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* ── Paso 0: Bienvenida ────────────────────────────────────────────── */}
          {step === "welcome" && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Configuración Rápida</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Podrás ingresar tus vehículos y mascotas ahora o más tarde. Luego veremos un recorrido de cómo funciona tu app.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Vehículos</p>
                    <p className="text-[11px] text-slate-500">Acceso a parqueadero</p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                    <PawPrint className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Mascotas</p>
                    <p className="text-[11px] text-slate-500">Censo residencial</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={() => setStep("vehicles")}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-semibold text-sm rounded-full shadow-md hover:shadow-lg transition-all"
                >
                  Empezar registro <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setStep("tour")}
                  className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Omitir registro e ir directo a la guía de la App
                </button>
              </div>
            </div>
          )}

          {/* ── Paso 1: Vehículos ───────────────────────────────────────────── */}
          {step === "vehicles" && (
            <div className="space-y-4">
              {vehicles.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {vehicles.map((v, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-blue-50/80 rounded-xl border border-blue-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{v.plate}</span>
                        <span className="text-slate-500 ml-1.5">({v.type}{v.brand ? ` · ${v.brand}` : ""})</span>
                      </div>
                      <button onClick={() => removeVehicle(i)} className="text-rose-500 hover:text-rose-700 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 border border-slate-100 bg-slate-50/50 rounded-2xl p-3.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <input
                      placeholder="Placa (ej. ABC123) *"
                      maxLength={FIELD_LIMITS.VEHICLE_PLATE_MAX_LENGTH}
                      value={vehicleForm.plate ?? ""}
                      onChange={(e) => setVehicleForm((f) => ({ ...f, plate: formatPlateInput(e.target.value) }))}
                      className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                  </div>
                  <select
                    value={vehicleForm.type ?? "Automóvil"}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, type: e.target.value }))}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  >
                    {VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <input
                    placeholder="Color"
                    maxLength={30}
                    value={vehicleForm.color ?? ""}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, color: e.target.value }))}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  />
                  <input
                    placeholder="Marca (ej. Renault)"
                    maxLength={50}
                    value={vehicleForm.brand ?? ""}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, brand: e.target.value }))}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  />
                  <input
                    placeholder="Modelo (ej. Logan)"
                    maxLength={50}
                    value={vehicleForm.model ?? ""}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  />
                </div>
                <button
                  onClick={addVehicle}
                  disabled={!vehicleForm.plate?.trim()}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar a la lista
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep("pets")}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-full transition-colors"
                >
                  Saltar vehículos
                </button>
                <button
                  onClick={() => setStep("pets")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-semibold text-xs rounded-full shadow-sm transition-all"
                >
                  Siguiente: Mascotas <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ── Paso 2: Mascotas ────────────────────────────────────────────── */}
          {step === "pets" && (
            <div className="space-y-4">
              {pets.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {pets.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-amber-50/80 rounded-xl border border-amber-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{p.name}</span>
                        <span className="text-slate-500 ml-1.5">({p.type}{p.breed ? ` · ${p.breed}` : ""})</span>
                      </div>
                      <button onClick={() => removePet(i)} className="text-rose-500 hover:text-rose-700 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 border border-slate-100 bg-slate-50/50 rounded-2xl p-3.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <input
                      placeholder="Nombre de la mascota *"
                      maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                      value={petForm.name ?? ""}
                      onChange={(e) => setPetForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                    />
                  </div>
                  <select
                    value={petForm.type ?? "Perro"}
                    onChange={(e) => setPetForm((f) => ({ ...f, type: e.target.value }))}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                  >
                    {PET_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <input
                    placeholder="Raza"
                    maxLength={50}
                    value={petForm.breed ?? ""}
                    onChange={(e) => setPetForm((f) => ({ ...f, breed: e.target.value }))}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                  />
                  <input
                    placeholder="Color"
                    maxLength={30}
                    value={petForm.color ?? ""}
                    onChange={(e) => setPetForm((f) => ({ ...f, color: e.target.value }))}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                  />
                  <label className="col-span-2 flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={petForm.isDangerousBreed ?? false}
                      onChange={(e) => setPetForm((f) => ({ ...f, isDangerousBreed: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-amber-500"
                    />
                    <span className="text-xs text-slate-600">Raza de manejo especial / potencialmente peligrosa</span>
                  </label>
                </div>
                <button
                  onClick={addPet}
                  disabled={!petForm.name?.trim()}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar a la lista
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep("vehicles")}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-full transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Volver
                </button>
                <button
                  onClick={() => setStep("tour")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-semibold text-xs rounded-full shadow-sm transition-all"
                >
                  Continuar a la Guía de la App <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ── Paso 3: Tour Visual Interactivo de la App ────────────────────────────── */}
          {step === "tour" && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 text-center relative overflow-hidden flex flex-col items-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-xs ${currentTourItem.bg}`}>
                  <TourIcon className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{currentTourItem.title}</h3>
                <p className="text-xs text-slate-600 mt-1.5 max-w-xs leading-relaxed">
                  {currentTourItem.desc}
                </p>

                {/* Tour Carousel Dots */}
                <div className="flex justify-center gap-1.5 mt-4">
                  {TOUR_FEATURES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setTourIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${tourIndex === i ? "w-6 bg-[var(--tenant-primary)]" : "w-1.5 bg-slate-300"}`}
                      title={`Módulo ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Controles del Tour */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => {
                    if (tourIndex > 0) setTourIndex(tourIndex - 1);
                    else setStep("pets");
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-full transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>

                {tourIndex < TOUR_FEATURES.length - 1 ? (
                  <button
                    onClick={() => setTourIndex(tourIndex + 1)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-semibold text-xs rounded-full shadow-sm transition-all"
                  >
                    Siguiente módulo <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => finish(false)}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-full shadow-sm transition-all disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : (
                      <><CheckCircle2 className="w-4 h-4" /> Finalizar y Entrar</>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
