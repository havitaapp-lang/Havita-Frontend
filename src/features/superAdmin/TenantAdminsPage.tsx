import React, { useState, useEffect } from 'react';
import { Shield, Plus, X, Trash2, Building2, UserCircle } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { notificationService } from '../../services/notificationService';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { FIELD_LIMITS } from '../../validation/rules/limits';
import { formatPhoneInput } from '../../utils/formatters';
import { normalizeEmail, sanitizeEmailInput, normalizeWhitespace } from '../../utils/sanitizers';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const TenantAdminsPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Assign Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState({ tenantId: '', role: 'COMMUNITY_ADMIN' });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, tenantsRes] = await Promise.all([
        apiClient.get('/users/tenant-admins'),
        apiClient.get('/tenants?size=1000')
      ]);
      setUsers((Array.isArray(usersRes) ? usersRes : (usersRes as any).data) || []);
      // Handle PageResponse structure
      const content = (tenantsRes as any)?.data?.content || (tenantsRes as any)?.content || tenantsRes;
      setTenants(Array.isArray(content) ? content : []);
    } catch {
      notificationService.showError('Error', 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssign = (user: any) => {
    setSelectedUser(user);
    setFormData({ tenantId: '', role: 'COMMUNITY_ADMIN' });
    setAssignModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const cleanName = normalizeWhitespace(createUserForm.name);
    const cleanEmail = normalizeEmail(createUserForm.email);

    if (!cleanName || cleanName.length < FIELD_LIMITS.NAME_MIN_LENGTH) {
      errs.name = 'El nombre completo es obligatorio (mínimo 2 caracteres).';
    }
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      errs.email = 'Ingresa un correo electrónico válido.';
    }
    if (createUserForm.phone.trim()) {
      const digits = createUserForm.phone.replace(/\D/g, '');
      if (digits.length < FIELD_LIMITS.PHONE_MIN_LENGTH) {
        errs.phone = 'Ingresa un número de teléfono válido (mínimo 7 dígitos).';
      }
    }
    if (!createUserForm.password || createUserForm.password.length < FIELD_LIMITS.PASSWORD_MIN_LENGTH) {
      errs.password = `La contraseña debe tener al menos ${FIELD_LIMITS.PASSWORD_MIN_LENGTH} caracteres.`;
    }

    if (Object.keys(errs).length > 0) {
      setCreateErrors(errs);
      return;
    }

    try {
      const { superAdminService } = await import('../../services/superAdminService');
      await superAdminService.createInternalUser({
        name: cleanName,
        email: cleanEmail,
        phone: createUserForm.phone.trim(),
        password: createUserForm.password,
        role: 'COMMUNITY_ADMIN'
      });
      setIsCreateModalOpen(false);
      setCreateErrors({});
      setCreateUserForm({ name: '', email: '', phone: '', password: '' });
      fetchData();
      notificationService.showSuccess('Administrador Creado', 'El usuario ha sido registrado y está listo para ser asignado.');
    } catch {
      notificationService.showError('Error', 'No se pudo crear el administrador. Es posible que el correo ya exista.');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantId) {
      notificationService.showWarning('Atención', 'Selecciona una copropiedad');
      return;
    }
    
    try {
      await apiClient.post('/memberships', {
        email: selectedUser.email,
        tenantId: formData.tenantId,
        role: formData.role
      });
      notificationService.showSuccess('Éxito', 'Membresía asignada exitosamente');
      setAssignModalOpen(false);
      fetchData();
    } catch (e: any) {
      notificationService.showError('Error', e.message || 'Error al asignar');
    }
  };

  const handleRemove = async (membershipId: string) => {
    if (!window.confirm('¿Seguro que deseas remover el acceso a esta copropiedad?')) return;
    try {
      await apiClient.delete(`/memberships/${membershipId}`);
      notificationService.showSuccess('Éxito', 'Acceso removido');
      fetchData();
    } catch (e: any) {
      notificationService.showError('Error', e.message || 'Error al remover');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando...</div>;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            Asignaciones y Membresías Globales
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Administra los roles y el acceso de cada usuario a múltiples copropiedades.
          </p>
        </div>
        <button
          onClick={() => {
            setCreateErrors({});
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Nuevo Administrador
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {users.map(user => (
          <div key={user.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg shadow-inner">
                <UserCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white leading-tight">{user.name}</h3>
                <p className="text-xs text-slate-400 font-mono">{user.email}</p>
              </div>
            </div>
            
            <div className="flex-1 space-y-2 mb-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Copropiedades Asignadas</p>
              {user.memberships.length === 0 && (
                <p className="text-xs text-slate-500 italic">No tiene copropiedades asignadas</p>
              )}
              {user.memberships.map((m: any) => (
                <div key={m.id} className="flex flex-col gap-1 p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 truncate max-w-[150px]" title={m.tenantName}>{m.tenantName}</span>
                    <button onClick={() => handleRemove(m.id)} className="text-slate-500 hover:text-rose-400 transition-colors" title="Quitar Acceso">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] font-bold">{m.role}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleOpenAssign(user)}
              className="w-full mt-auto bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Asignar Copropiedad
            </button>
          </div>
        ))}
      </div>

      {assignModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Asignar Copropiedad
              </h3>
              <button type="button" onClick={() => setAssignModalOpen(false)} aria-label="Cerrar modal" className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl mb-4 border border-slate-800">
              <p className="text-xs text-slate-400">Usuario seleccionado:</p>
              <p className="font-bold text-sm text-white">{selectedUser.name}</p>
              <p className="text-xs text-slate-500 font-mono">{selectedUser.email}</p>
            </div>

            <form onSubmit={handleAssign} className="space-y-4 text-xs">
              <FormField id="assign-tenant" label="Copropiedad" required theme="dark">
                <select
                  required
                  value={formData.tenantId}
                  onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">-- Seleccionar --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.city})</option>
                  ))}
                </select>
              </FormField>

              <FormField id="assign-role" label="Rol a Asignar" required theme="dark">
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="COMMUNITY_ADMIN">Administrador de Conjunto</option>
                  <option value="SECURITY">Portería / Seguridad</option>
                  <option value="RESIDENT">Residente</option>
                </select>
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
                >
                  Asignar y Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button 
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              aria-label="Cerrar modal"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <UserCircle className="w-6 h-6 text-blue-500" />
              Nuevo Administrador
            </h2>
            <form onSubmit={handleCreateUser} noValidate className="space-y-4 text-xs">
              <FormField
                id="admin-create-name"
                label="Nombre Completo"
                required
                theme="dark"
                maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                currentLength={createUserForm.name.length}
                error={createErrors.name}
              >
                <Input
                  theme="dark"
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.NAME_MAX_LENGTH}
                  value={createUserForm.name}
                  onChange={e => {
                    setCreateErrors(prev => ({ ...prev, name: '' }));
                    setCreateUserForm({ ...createUserForm, name: e.target.value.slice(0, FIELD_LIMITS.NAME_MAX_LENGTH) });
                  }}
                  placeholder="Ej: María Fernanda Gómez"
                />
              </FormField>

              <FormField
                id="admin-create-email"
                label="Correo Electrónico"
                required
                theme="dark"
                error={createErrors.email}
              >
                <Input
                  theme="dark"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={FIELD_LIMITS.EMAIL_MAX_LENGTH}
                  value={createUserForm.email}
                  onChange={e => {
                    setCreateErrors(prev => ({ ...prev, email: '' }));
                    setCreateUserForm({ ...createUserForm, email: sanitizeEmailInput(e.target.value) });
                  }}
                  onBlur={() => {
                    if (createUserForm.email) {
                      setCreateUserForm(prev => ({ ...prev, email: normalizeEmail(prev.email) }));
                    }
                  }}
                  placeholder="admin@copropiedad.com"
                />
              </FormField>

              <FormField
                id="admin-create-phone"
                label="Teléfono Celular"
                theme="dark"
                error={createErrors.phone}
              >
                <Input
                  theme="dark"
                  type="tel"
                  autoComplete="tel"
                  maxLength={FIELD_LIMITS.PHONE_MAX_LENGTH}
                  value={createUserForm.phone}
                  onChange={e => {
                    setCreateErrors(prev => ({ ...prev, phone: '' }));
                    setCreateUserForm({ ...createUserForm, phone: formatPhoneInput(e.target.value) });
                  }}
                  placeholder="+57 300 000 0000"
                />
              </FormField>

              <FormField
                id="admin-create-password"
                label="Contraseña Inicial"
                required
                theme="dark"
                error={createErrors.password}
                helperText="Mínimo 6 caracteres."
              >
                <Input
                  theme="dark"
                  type="password"
                  autoComplete="new-password"
                  required
                  maxLength={FIELD_LIMITS.PASSWORD_MAX_LENGTH}
                  value={createUserForm.password}
                  onChange={e => {
                    setCreateErrors(prev => ({ ...prev, password: '' }));
                    setCreateUserForm({ ...createUserForm, password: e.target.value.slice(0, FIELD_LIMITS.PASSWORD_MAX_LENGTH) });
                  }}
                />
              </FormField>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg cursor-pointer"
                >
                  Crear Administrador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
