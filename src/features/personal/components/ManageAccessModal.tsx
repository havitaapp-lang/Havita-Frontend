import { useState } from 'react';
import { X, KeyRound, ShieldCheck, Check, Mail, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import type { PersonalMember, SystemRole, GateAssignment } from '../types/personal.types';
import { personalService } from '../services/personalService';
import { notificationService } from '../../../services/notificationService';

interface ManageAccessModalProps {
  member: PersonalMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManageAccessModal: React.FC<ManageAccessModalProps> = ({
  member,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [enabled, setEnabled] = useState(member?.systemAccess?.enabled || false);
  const [loginEmail, setLoginEmail] = useState(
    member?.systemAccess?.loginEmail || member?.systemAccess?.username || member?.email || ''
  );
  const [password, setPassword] = useState(member?.systemAccess?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<SystemRole>(member?.systemAccess?.role || 'PORTERÍA');
  const [assignedGate, setAssignedGate] = useState<GateAssignment>(member?.systemAccess?.assignedGate || 'Portería principal');
  const [accessStatus, setAccessStatus] = useState<'ACTIVO' | 'INACTIVO'>(member?.systemAccess?.status || 'ACTIVO');
  const [loading, setLoading] = useState(false);

  // Sincronizar estado cuando se selecciona otro miembro
  const [prevMemberId, setPrevMemberId] = useState(member?.id);
  if (member && member.id !== prevMemberId) {
    setPrevMemberId(member.id);
    setEnabled(member.systemAccess?.enabled || false);
    setLoginEmail(member.systemAccess?.loginEmail || member?.systemAccess?.username || member.email || '');
    setPassword(member.systemAccess?.password || '');
    setRole(member.systemAccess?.role || 'PORTERÍA');
    setAssignedGate(member.systemAccess?.assignedGate || 'Portería principal');
    setAccessStatus(member.systemAccess?.status || 'ACTIVO');
  }

  if (!isOpen || !member) return null;

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let generated = '';
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
    notificationService.showToast('Nueva contraseña generada', 'info');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enabled) {
      if (!loginEmail.trim()) {
        notificationService.showToast('El correo de acceso es obligatorio', 'warning');
        return;
      }
      if (password && password.length < 6) {
        notificationService.showToast('La contraseña debe tener mínimo 6 caracteres', 'warning');
        return;
      }
    }

    try {
      setLoading(true);
      const cleanEmail = loginEmail.trim().toLowerCase();
      await personalService.updateSystemAccess(member.id, {
        enabled,
        username: cleanEmail,
        loginEmail: cleanEmail,
        password: password.trim() || undefined,
        role,
        status: accessStatus,
        assignedGate: (role === 'PORTERÍA' || role === 'SEGURIDAD') ? assignedGate : undefined,
      });

      // Sincronizar también el email principal del miembro si estaba vacío
      if (!member.email && cleanEmail) {
        await personalService.updatePersonal(member.id, { email: cleanEmail });
      }

      notificationService.showToast(`Acceso actualizado para ${member.firstName} ${member.lastName}`, 'success');
      onSuccess();
      onClose();
    } catch {
      notificationService.showToast('Error al actualizar acceso', 'error');
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
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          {/* Toggle Access */}
          <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200">
            <div>
              <p className="font-bold text-slate-900 text-xs">Cuenta de Usuario Habilitada</p>
              <p className="text-[11px] text-slate-500">Permitir inicio de sesión en Havita</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>

          {enabled && (
            <div className="space-y-3.5 animate-fade-in">
              {/* Correo de acceso */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  Correo de Acceso (Usuario) *
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">El empleado inicia sesión con este correo electrónico.</p>
              </div>

              {/* Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    Contraseña / Clave de Acceso
                  </label>
                  <button
                    type="button"
                    onClick={generateSecurePassword}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Generar nueva
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={member.systemAccess?.password ? '••••••••••' : 'Asignar contraseña'}
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rol Operativo</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as SystemRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:border-blue-500 focus:outline-none text-xs"
                >
                  <option value="PORTERÍA">PORTERÍA (Recepción de visitas y encomiendas)</option>
                  <option value="SEGURIDAD">SEGURIDAD (Bitácora de vigilancia)</option>
                  <option value="ADMINISTRADOR">ADMINISTRADOR (Gestión de la copropiedad)</option>
                  <option value="MANTENIMIENTO">MANTENIMIENTO (Órdenes y reparaciones)</option>
                  <option value="PERSONAL_OPERATIVO">PERSONAL OPERATIVO (Consulta)</option>
                  <option value="SOLO_LECTURA">SOLO LECTURA</option>
                </select>
              </div>

              {(role === 'PORTERÍA' || role === 'SEGURIDAD') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Puesto / Portería Asignada
                  </label>
                  <select
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">Estado de la Cuenta</label>
                <select
                  value={accessStatus}
                  onChange={(e) => setAccessStatus(e.target.value as 'ACTIVO' | 'INACTIVO')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:border-blue-500 focus:outline-none text-xs"
                >
                  <option value="ACTIVO">ACTIVO (Permitir acceso inmediato)</option>
                  <option value="INACTIVO">INACTIVO (Bloqueado temporalmente)</option>
                </select>
              </div>
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
