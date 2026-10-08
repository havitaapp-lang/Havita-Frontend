import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Shield,
  X,
  Check,
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import { notificationService } from '../../services/notificationService';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import { normalizeEmail, sanitizeEmailInput, normalizeWhitespace } from '../../utils/sanitizers';
import type { InternalUser, BackofficeRole } from '../../types/superAdmin';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GlobalUsersPage = () => {
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});

  // Invite Form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'PLATFORM_ADMIN' as BackofficeRole,
  });

  const loadUsers = () => {
    superAdminService.getInternalUsers().then(setUsers);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const cleanName = normalizeWhitespace(formData.name);
    const cleanEmail = normalizeEmail(formData.email);

    if (!cleanName || cleanName.length < FIELD_LIMITS.NAME_MIN_LENGTH) {
      errs.name = 'El nombre completo es obligatorio.';
    }
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      errs.email = 'Ingresa un correo corporativo válido.';
    }

    if (Object.keys(errs).length > 0) {
      setInviteErrors(errs);
      return;
    }

    await superAdminService.createInternalUser({
      ...formData,
      name: cleanName,
      email: cleanEmail,
    });
    notificationService.showToast(`Invitación enviada a ${cleanName}`, 'success');
    setIsInviteModalOpen(false);
    setInviteErrors({});
    setFormData({ name: '', email: '', phone: '', role: 'PLATFORM_ADMIN' });
    loadUsers();
  };

  const handleToggleStatus = async (user: InternalUser) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await superAdminService.updateInternalUserStatus(user.id, newStatus);
    notificationService.showToast(`Estado de ${user.name} cambiado a ${newStatus}`, 'info');
    loadUsers();
  };

  const handleChangeRole = async (user: InternalUser, newRole: BackofficeRole) => {
    await superAdminService.updateInternalUserRole(user.id, newRole);
    notificationService.showToast(`Rol de ${user.name} actualizado a ${newRole}`, 'success');
    loadUsers();
  };

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const getRoleBadge = (role: BackofficeRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Super Admin</span>;
      case 'PLATFORM_ADMIN':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Platform Admin</span>;
      case 'READ_ONLY':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/50 text-slate-300 border border-slate-600/40">Read Only</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            Usuarios Internos de Havita
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Equipo corporativo y operadores SaaS con permisos de acceso a la consola global.
          </p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-[var(--tenant-primary)] hover:bg-blue-600 text-white rounded-xl text-xs font-bold px-4 py-2.5 shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Invitar Usuario Interno
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Todos los Roles Internos</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="PLATFORM_ADMIN">Platform Admin</option>
            <option value="READ_ONLY">Read Only</option>
          </select>
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            maxLength={FIELD_LIMITS.SEARCH_MAX_LENGTH}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            aria-label="Buscar usuarios internos por nombre o correo"
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Users Table (Requerimiento 9 exacto) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nombre</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Rol</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4">Último Acceso</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Nombre */}
                  <td className="py-3 px-4 font-bold text-white">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{user.name}</span>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {user.email}
                  </td>

                  {/* Rol */}
                  <td className="py-3 px-4">
                    {getRoleBadge(user.role)}
                  </td>

                  {/* Estado */}
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      user.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : user.status === 'INVITED'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {user.status === 'ACTIVE' ? 'Activo' : user.status === 'INVITED' ? 'Invitado' : 'Inactivo'}
                    </span>
                  </td>

                  {/* Último acceso */}
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {user.lastLoginAt}
                  </td>

                  {/* Acciones */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(user, e.target.value as BackofficeRole)}
                        className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-300 focus:outline-none cursor-pointer"
                        title="Cambiar rol"
                      >
                        <option value="SUPER_ADMIN">Super Admin</option>
                        <option value="PLATFORM_ADMIN">Platform Admin</option>
                        <option value="READ_ONLY">Read Only</option>
                      </select>

                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          user.status === 'ACTIVE'
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {user.status === 'ACTIVE' ? 'Suspender' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-bold text-slate-200">No se encontraron usuarios internos con ese criterio.</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Invitar Usuario Interno
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setInviteErrors({});
                }}
                aria-label="Cerrar modal"
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteUser} noValidate className="space-y-3.5 text-xs">
              <FormField
                id="invite-user-name"
                label="Nombre Completo"
                required
                theme="dark"
                maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                currentLength={formData.name.length}
                error={inviteErrors.name}
              >
                <Input
                  theme="dark"
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                  value={formData.name}
                  onChange={(e) => {
                    setInviteErrors((prev) => ({ ...prev, name: '' }));
                    setFormData({ ...formData, name: e.target.value.slice(0, FIELD_LIMITS.NAME_MAX_LENGTH) });
                  }}
                  placeholder="Ej: Daniel Morales"
                />
              </FormField>

              <FormField
                id="invite-user-email"
                label="Correo Corporativo"
                required
                theme="dark"
                error={inviteErrors.email}
              >
                <Input
                  theme="dark"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={FIELD_LIMITS.EMAIL_MAX_LENGTH}
                  value={formData.email}
                  onChange={(e) => {
                    setInviteErrors((prev) => ({ ...prev, email: '' }));
                    setFormData({ ...formData, email: sanitizeEmailInput(e.target.value) });
                  }}
                  onBlur={() => {
                    if (formData.email) {
                      setFormData((prev) => ({ ...prev, email: normalizeEmail(prev.email) }));
                    }
                  }}
                  placeholder="daniel@havita.co"
                />
              </FormField>

              <FormField
                id="invite-user-role"
                label="Rol de Acceso"
                required
                theme="dark"
              >
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as BackofficeRole })}
                  className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="SUPER_ADMIN">Super Admin (Acceso total)</option>
                  <option value="PLATFORM_ADMIN">Platform Admin (Gestión de clientes y planes)</option>
                  <option value="READ_ONLY">Read Only (Solo consulta y auditoría)</option>
                </select>
              </FormField>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsInviteModalOpen(false);
                    setInviteErrors({});
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Enviar Invitación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
