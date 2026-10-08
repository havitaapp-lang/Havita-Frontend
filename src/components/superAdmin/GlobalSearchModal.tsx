import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building, Building2, User, CreditCard, X, ArrowRight } from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import type { PlatformTenant, Organization, GlobalUser } from '../../types/superAdmin';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<GlobalUser[]>([]);

  useEffect(() => {
    if (isOpen) {
      superAdminService.getTenants().then(setTenants);
      superAdminService.getOrganizations().then(setOrganizations);
      superAdminService.getGlobalUsers().then(setUsers);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const filteredTenants = q
    ? tenants.filter(t => t.name.toLowerCase().includes(q) || t.nit.includes(q) || t.city.toLowerCase().includes(q))
    : tenants.slice(0, 3);

  const filteredOrgs = q
    ? organizations.filter(o => o.name.toLowerCase().includes(q) || o.nit.includes(q) || o.city.toLowerCase().includes(q))
    : organizations.slice(0, 2);

  const filteredUsers = q
    ? users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    : users.slice(0, 2);

  const handleSelectTenant = (id: string) => {
    onClose();
    navigate(`/super-admin/tenants/${id}`);
  };

  const handleSelectOrg = (_id: string) => {
    onClose();
    navigate('/super-admin/organizations');
  };

  const handleSelectUser = (_id: string) => {
    onClose();
    navigate('/super-admin/users');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-800 text-slate-100 max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Search Input */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar comunidad, organización, usuario, NIT, correo..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 rounded-md border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 text-xs">
          {/* Tenants Section */}
          {filteredTenants.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Comunidades Residenciales ({filteredTenants.length})</span>
                <span className="text-slate-500 font-normal">Tenants</span>
              </div>
              <div className="space-y-1">
                {filteredTenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTenant(t.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                        <Building className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white group-hover:text-blue-400 truncate">
                          {t.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {t.city} • {t.propertiesCount} propiedades • NIT {t.nit}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {t.planName}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Organizations Section */}
          {filteredOrgs.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Organizaciones Administradoras ({filteredOrgs.length})
              </div>
              <div className="space-y-1">
                {filteredOrgs.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => handleSelectOrg(o.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white group-hover:text-purple-400 truncate">
                          {o.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {o.city} • {o.communitiesCount} comunidades • NIT {o.nit}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Users Section */}
          {filteredUsers.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Usuarios ({filteredUsers.length})
              </div>
              <div className="space-y-1">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white group-hover:text-emerald-400 truncate">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {u.email} • {u.role}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredTenants.length === 0 && filteredOrgs.length === 0 && filteredUsers.length === 0 && (
            <div className="p-8 text-center text-slate-400 space-y-1">
              <p className="font-bold text-slate-300">No se encontraron resultados para "{query}"</p>
              <p className="text-xs text-slate-500">Intenta buscar por ciudad, NIT, plan o nombre de administrador.</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>Búsqueda global instantánea</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-slate-400" />
              SaaS Backoffice
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
