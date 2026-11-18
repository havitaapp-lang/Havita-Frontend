import { useState } from 'react';
import { X, KeyRound, ShieldCheck, Check, Mail, Lock, Eye, EyeOff, RefreshCw, Info } from 'lucide-react';
import type { PersonalMember, GateAssignment } from '../types/personal.types';
import { personalService } from '../services/personalService';
import { notificationService } from '../../../services/notificationService';

interface ManageAccessModalProps {
  member: PersonalMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AccessRole = 'SECURITY' | 'STAFF';

const MIN_PASSWORD = 8;

/** Rol que muestra el formulario a partir de lo que trae el colaborador (incluye los códigos antiguos del módulo). */
const toAccessRole = (role?: string): AccessRole =>
  role === 'SECURITY' || role === 'PORTERÍA' || role === 'SEGURIDAD' ? 'SECURITY' : 'STAFF';

/** Contraseña aleatoria con el generador criptográfico del navegador (no Math.random). */
const generatePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

/**
 * Gestiona el acceso al sistema del colaborador EN EL SERVIDOR (PUT /staff/{id}/access). Antes todo esto se guardaba
 * solo en el navegador, contraseña incluida. La contraseña nunca se precarga ni se guarda: solo se envía si se escribe
 * una nueva. Solo se asignan los roles Portería (SECURITY) y Personal operativo (STAFF).
 */
export const ManageAccessModal: React.FC<ManageAccessModalProps> = ({
  member,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const initial = (m: PersonalMember | null) => ({
    enabled: Boolean(m?.systemAccess?.enabled && m.systemAccess.status !== 'INACTIVO'),
    loginEmail: m?.systemAccess?.loginEmail || m?.systemAccess?.username || m?.email || '',
    role: toAccessRole(m?.systemAccess?.role),
    gate: (m?.systemAccess?.assignedGate || 'Portería principal') as GateAssignment,
  });
  const [enabled, setEnabled] = useState(initial(member).enabled);
  const [loginEmail, setLoginEmail] = useState(initial(member).loginEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AccessRole>(initial(member).role);
  const [assignedGate, setAssignedGate] = useState<GateAssignment>(initial(member).gate);
  const [loading, setLoading] = useState(false);

  // Sincronizar estado cuando se selecciona otro miembro
  const [prevMemberId, setPrevMemberId] = useState(member?.id);
  if (member && member.id !== prevMemberId) {
    const next = initial(member);
    setPrevMemberId(member.id);
    setEnabled(next.enabled);
    setLoginEmail(next.loginEmail);
    setPassword('');
    setRole(next.role);
    setAssignedGate(next.gate);
  }

  if (!isOpen || !member) return null;

  const hasAccount = Boolean(member.systemAccess?.enabled);
  const shared = Boolean(member.systemAccess?.shared);

  const handleGenerate = () => {
    setPassword(generatePassword());
    setShowPassword(true);
    notificationService.showToast('Nueva contraseña generada. Compártela de forma segura.', 'info');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enabled) {
      if (!loginEmail.trim()) {
        notificationService.showToast('El correo de acceso es obligatorio', 'warning');
        return;
      }
      if (!hasAccount && !password) {
        notificationService.showToast('Asigna una contraseña para crear el acceso', 'warning');
        return;
      }
      if (password && password.length < MIN_PASSWORD) {
        notificationService.showToast(`La contraseña debe tener mínimo ${MIN_PASSWORD} caracteres`, 'warning');
        return;
      }
    }

    try {
      setLoading(true);
      const cleanEmail = loginEmail.trim().toLowerCase();
      const updated = await personalService.updateSystemAccess(member.id, {
        enabled,
        // En una cuenta compartida el correo no se envía: el servidor lo rechazaría.
        loginEmail: shared ? undefined : cleanEmail,
        password: shared ? undefined : password || undefined,
        role,
      });

      // La portería asignada es un dato del colaborador.
      if (role === 'SECURITY' && assignedGate !== (member.systemAccess?.assignedGate || '')) {
        await personalService.updatePersonal(updated, {
          systemAccess: { ...(updated.systemAccess || member.systemAccess!), assignedGate },
        });
      }

      notificationService.showToast(`Acceso actualizado para ${member.firstName} ${member.lastName}`, 'success');
      setPassword('');
      onSuccess();
      onClose();
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message;
      notificationService.showError('No se pudo actualizar el acceso', message || 'Inténtalo de nuevo en unos segundos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-600" />
              Gestionar Acceso al Sistema
            </h3>
            <p className="text-xs text-slate-500">
              {member.firstName} {member.lastName} · {member.position}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          {/* Toggle Access */}
          <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200">
            <div>
              <p className="font-bold text-slate-900 text-xs">Acceso al sistema habilitado</p>
              <p className="text-[11px] text-slate-500">
                {enabled ? 'Puede iniciar sesión en esta comunidad' : 'Sin acceso a esta comunidad (la cuenta no se borra)'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                aria-label="Acceso al sistema habilitado"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>

          {enabled && (
            <div className="space-y-3.5 animate-fade-in">
              {shared && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Esta cuenta también tiene acceso en otra comunidad: su correo y su contraseña solo los puede cambiar su titular.</p>
                </div>
              )}

              {/* Correo de acceso */}
              <div>
                <label htmlFor="access-email" className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  Correo de Acceso (Usuario) *
                </label>
                <input
                  id="access-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={shared}
                  maxLength={150}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:bg-white focus:border-blue-500 focus:outline-none disabled:text-slate-400"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">El empleado inicia sesión con este correo electrónico.</p>
              </div>

              {/* Contraseña */}
              {!shared && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="access-password" className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      {hasAccount ? 'Nueva contraseña' : 'Contraseña *'}
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Generar
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="access-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      autoComplete="new-password"
                      maxLength={72}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={hasAccount ? 'Déjala en blanco para no cambiarla' : `Mínimo ${MIN_PASSWORD} caracteres`}
                      className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {hasAccount && (
                    <p className="text-[10px] text-slate-400 mt-1">Al cambiarla se cierran las sesiones abiertas del colaborador.</p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="access-role" className="block font-bold text-slate-700 mb-1">Rol operativo</label>
                <select
                  id="access-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as AccessRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:border-blue-500 focus:outline-none text-xs"
                >
                  <option value="SECURITY">Portería (visitas, paquetes, citofonía)</option>
                  <option value="STAFF">Personal operativo (consulta)</option>
                </select>
              </div>

              {role === 'SECURITY' && (
                <div>
                  <label htmlFor="access-gate" className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Puesto / Portería Asignada
                  </label>
                  <select
                    id="access-gate"
                    value={assignedGate}
                    onChange={(e) => setAssignedGate(e.target.value as GateAssignment)}
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 font-semibold focus:outline-none text-xs"
                  >
                    <option value="Portería principal">Portería principal</option>
                    <option value="Portería secundaria">Portería vehicular secundaria</option>
                    <option value="Todas las porterías">Todas las porterías</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[var(--tenant-primary)] hover:bg-blue-600 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
