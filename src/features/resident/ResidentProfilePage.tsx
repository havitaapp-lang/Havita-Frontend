import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Phone,
  Mail,
  Lock,
  Edit3,
  X,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Shield,
  Clock,
  Loader2,
} from 'lucide-react';
import { profileService, type UserProfileDto, type UpdateProfileDto } from '../../services/profileService';
import { useAuth } from '../../contexts/AuthContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const PASSWORD_MIN = 8;

// ─── Password strength indicator ─────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'Muy débil', color: 'bg-red-500' };
  if (score === 2) return { score, label: 'Débil', color: 'bg-orange-400' };
  if (score === 3) return { score, label: 'Aceptable', color: 'bg-yellow-400' };
  if (score === 4) return { score, label: 'Fuerte', color: 'bg-blue-500' };
  return { score, label: 'Muy fuerte', color: 'bg-green-500' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  value: string | null | undefined;
  placeholder?: string;
}
function FieldRow({ label, value, placeholder = '—' }: FieldRowProps) {
  return (
    <div className="py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide sm:w-36 shrink-0">
        {label}
      </span>
      <span className="text-slate-800 font-medium text-sm">{value || placeholder}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResidentProfilePage() {
  const { user, updateUser, logout } = useAuth() as any;
  const navigate = useNavigate();

  // ── Profile state ──
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // ── Edit mode ──
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateProfileDto>({ fullName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Password change ──
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [changingPw, setChangingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  // ── Load profile ──
  useEffect(() => {
    setLoadingProfile(true);
    profileService
      .getProfile()
      .then((data) => {
        setProfile(data);
        setEditForm({ fullName: data.fullName, phone: data.phone ?? '' });
      })
      .catch((err: any) => {
        setProfileError(err?.message || 'No se pudo cargar tu perfil.');
      })
      .finally(() => setLoadingProfile(false));
  }, []);

  // ── Edit handlers ──
  const handleStartEdit = () => {
    if (!profile) return;
    setEditForm({ fullName: profile.fullName, phone: profile.phone ?? '' });
    setSaveError(null);
    setSaveSuccess(false);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.fullName.trim()) {
      setSaveError('El nombre completo es requerido.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await profileService.updateProfile(editForm);
      setProfile(updated);
      // Sincronizar nombre en el estado de sesión global
      updateUser({ name: updated.fullName, phone: updated.phone });
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      const msg =
        err?.data?.message || err?.message || 'No se pudo actualizar el perfil.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Password handlers ──
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);

    if (pwForm.newPassword.length < PASSWORD_MIN) {
      setPwError(`La nueva contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`);
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmNewPassword) {
      setPwError('Las contraseñas nuevas no coinciden.');
      return;
    }

    setChangingPw(true);
    try {
      await profileService.changePassword(pwForm);
      setPwSuccess(true);
      // El backend revocó todos los refresh tokens → forzar re-login
      setTimeout(() => {
        logout();
        navigate('/login', {
          replace: true,
          state: { reason: 'password_changed' },
        });
      }, 2000);
    } catch (err: any) {
      const code = err?.data?.code || err?.code;
      if (code === 'WRONG_CURRENT_PASSWORD') {
        setPwError('La contraseña actual no es correcta.');
      } else if (code === 'PASSWORD_MISMATCH') {
        setPwError('Las contraseñas nuevas no coinciden.');
      } else if (code === 'SAME_PASSWORD') {
        setPwError('La nueva contraseña no puede ser igual a la actual.');
      } else {
        setPwError(err?.data?.message || err?.message || 'No se pudo cambiar la contraseña.');
      }
    } finally {
      setChangingPw(false);
    }
  };

  const strength = pwForm.newPassword ? passwordStrength(pwForm.newPassword) : null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--tenant-primary)]" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-slate-600">{profileError || 'No se pudo cargar el perfil.'}</p>
      </div>
    );
  }

  const initials = getInitials(profile.fullName);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* ── Page title ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mi Perfil</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestiona tu información personal y seguridad de cuenta.</p>
      </div>

      {/* ── Success banner ── */}
      {saveSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Información actualizada correctamente.
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          CARD 1 — INFORMACIÓN PERSONAL
      ════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Card header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar con iniciales */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--tenant-primary)] to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-sm shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{profile.fullName}</h2>
              <p className="text-sm text-slate-500">{profile.email}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                profile.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {profile.status === 'ACTIVE' ? 'Cuenta activa' : profile.status}
              </span>
            </div>
          </div>

          {!editing && (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--tenant-primary)] bg-[var(--tenant-primary)]/10 hover:bg-[var(--tenant-primary)]/20 rounded-full transition-colors shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar
            </button>
          )}
        </div>

        <div className="border-t border-slate-100 mx-6" />

        {/* ── MODO LECTURA ── */}
        {!editing && (
          <div className="px-6 pb-6 divide-y divide-slate-50">
            <FieldRow label="Nombre completo" value={profile.fullName} />
            <div className="py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide sm:w-36 shrink-0">
                Correo electrónico
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-800 font-medium text-sm">{profile.email}</span>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-medium">Solo lectura</span>
              </div>
            </div>
            <FieldRow label="Teléfono" value={profile.phone} placeholder="No registrado" />
            <FieldRow label="Miembro desde" value={formatDate(profile.createdAt)} />
          </div>
        )}

        {/* ── MODO EDICIÓN ── */}
        {editing && (
          <form onSubmit={handleSaveProfile} className="px-6 pb-6 space-y-4 pt-4">
            {saveError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {saveError}
              </div>
            )}

            {/* Nombre completo */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Nombre completo
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/30 focus:border-[var(--tenant-primary)] bg-white"
                  placeholder="Tu nombre completo"
                  maxLength={150}
                  required
                />
              </div>
            </div>

            {/* Email (solo lectura) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="email"
                  value={profile.email}
                  readOnly
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-100 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                El correo electrónico no puede modificarse desde aquí.
              </p>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Teléfono
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/30 focus:border-[var(--tenant-primary)] bg-white"
                  placeholder="Ej. 3001234567"
                  maxLength={50}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[var(--tenant-primary)] rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ════════════════════════════════════════════════════
          CARD 2 — SEGURIDAD
      ════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Seguridad</h3>
              <p className="text-xs text-slate-500">Gestiona tu contraseña de acceso.</p>
            </div>
          </div>

          {!showPasswordSection && (
            <button
              onClick={() => {
                setShowPasswordSection(true);
                setPwError(null);
                setPwSuccess(false);
                setPwForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors shrink-0"
            >
              <Lock className="w-3.5 h-3.5" />
              Cambiar contraseña
            </button>
          )}
        </div>

        {/* Password row (collapsed) */}
        {!showPasswordSection && (
          <>
            <div className="border-t border-slate-100 mx-6" />
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Contraseña</p>
                <p className="text-sm text-slate-700 font-mono tracking-widest">••••••••••••</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Actualizado: {formatDate(profile.updatedAt)}</span>
              </div>
            </div>
          </>
        )}

        {/* ── FORMULARIO CAMBIO DE CONTRASEÑA ── */}
        {showPasswordSection && (
          <>
            <div className="border-t border-slate-100 mx-6" />

            {pwSuccess ? (
              <div className="px-6 py-6 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">¡Contraseña actualizada!</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Por seguridad, cerramos tu sesión. Inicia sesión con tu nueva contraseña.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Redirigiendo al inicio de sesión...
                </div>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="px-6 py-5 space-y-4">
                {pwError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {pwError}
                  </div>
                )}

                {/* Contraseña actual */}
                {(['current', 'new', 'confirm'] as const).map((field) => {
                  const labels = {
                    current: 'Contraseña actual',
                    new: 'Nueva contraseña',
                    confirm: 'Confirmar nueva contraseña',
                  };
                  const keys = {
                    current: 'currentPassword',
                    new: 'newPassword',
                    confirm: 'confirmNewPassword',
                  } as const;
                  return (
                    <div key={field}>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                        {labels[field]}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type={showPw[field] ? 'text' : 'password'}
                          value={pwForm[keys[field]]}
                          onChange={(e) => setPwForm({ ...pwForm, [keys[field]]: e.target.value })}
                          className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/30 focus:border-[var(--tenant-primary)] bg-white"
                          placeholder={field === 'current' ? 'Tu contraseña actual' : `Mín. ${PASSWORD_MIN} caracteres`}
                          required
                          minLength={field !== 'current' ? PASSWORD_MIN : undefined}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((p) => ({ ...p, [field]: !p[field] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          tabIndex={-1}
                        >
                          {showPw[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Indicador de fortaleza solo para nueva contraseña */}
                      {field === 'new' && strength && pwForm.newPassword && (
                        <div className="mt-2 space-y-1">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-colors ${
                                  i <= strength.score ? strength.color : 'bg-slate-100'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-[11px] text-slate-400">{strength.label}</p>
                        </div>
                      )}
                    </div>
                  );
                })}

                <p className="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
                  Al cambiar tu contraseña, se cerrará tu sesión actual por seguridad.
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPasswordSection(false)}
                    disabled={changingPw}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={changingPw}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-800 rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-all shadow-sm"
                  >
                    {changingPw ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Actualizar contraseña
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
