import { Eye, ShieldCheck, CheckCircle, AlertTriangle, KeyRound } from 'lucide-react';
import type { PersonalMember } from '../types/personal.types';
import { useNavigate } from 'react-router-dom';

interface PersonalTableProps {
  members: PersonalMember[];
  onToggleStatus: (member: PersonalMember) => void;
  onManageAccess: (member: PersonalMember) => void;
}

export const PersonalTable: React.FC<PersonalTableProps> = ({
  members,
  onToggleStatus,
  onManageAccess,
}) => {
  const navigate = useNavigate();

  if (members.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-2">
        <p className="font-bold text-slate-800 text-sm">No se encontró personal registrado</p>
        <p className="text-xs text-slate-400">Intenta cambiar los filtros de búsqueda o agrega un nuevo colaborador.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Colaborador</th>
              <th className="py-3 px-3">Documento</th>
              <th className="py-3 px-3">Cargo & Área</th>
              <th className="py-3 px-3">Vinculación</th>
              <th className="py-3 px-3">Turno Actual</th>
              <th className="py-3 px-3">Acceso Sistema</th>
              <th className="py-3 px-3">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {members.map((m) => (
              <tr
                key={m.id}
                className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                onClick={() => navigate(`/admin/personal/${m.id}`)}
              >
                {/* Colaborador */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                      alt={m.firstName}
                      className="w-9 h-9 rounded-full object-cover bg-slate-100 ring-2 ring-slate-100 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 group-hover:text-[var(--tenant-primary)] transition-colors leading-tight truncate">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{m.phone || m.email}</p>
                    </div>
                  </div>
                </td>

                {/* Documento */}
                <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                  <span className="font-bold text-slate-900 mr-1">{m.documentType}</span>
                  {m.documentNumber}
                </td>

                {/* Cargo & Área */}
                <td className="py-3.5 px-3">
                  <p className="font-bold text-slate-900 leading-tight">{m.position}</p>
                  <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                    {m.area}
                  </span>
                </td>

                {/* Vinculación */}
                <td className="py-3.5 px-3">
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      m.contractType === 'Empleado'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : m.contractType === 'Contratista'
                        ? 'bg-purple-50 text-purple-700 border border-purple-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}
                  >
                    {m.contractType}
                  </span>
                  {m.company && (
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">{m.company}</p>
                  )}
                </td>

                {/* Turno Actual */}
                <td className="py-3.5 px-3">
                  {m.currentShift ? (
                    <div>
                      <p className="font-bold text-slate-800 text-[11px] leading-tight">{m.currentShift.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{m.currentShift.schedule}</p>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Sin turno asignado</span>
                  )}
                </td>

                {/* Acceso Sistema */}
                <td className="py-3.5 px-3">
                  {m.systemAccess?.enabled ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-black text-[10px] border border-emerald-200">
                          {m.systemAccess.role}
                        </span>
                        {m.systemAccess.role === 'PORTERÍA' && (
                          <span
                            className="text-blue-600 font-bold text-[10px] flex items-center gap-0.5"
                            title={m.systemAccess.assignedGate || 'Portería principal'}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {m.systemAccess.assignedGate?.replace('Portería ', '') || 'Principal'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]" title={m.systemAccess.loginEmail || m.systemAccess.username}>
                        {m.systemAccess.loginEmail || m.systemAccess.username}
                      </p>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-[11px] italic">Sin acceso</span>
                  )}
                </td>

                {/* Estado */}
                <td className="py-3.5 px-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      m.status === 'ACTIVO'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : m.status === 'SUSPENDIDO'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        m.status === 'ACTIVO'
                          ? 'bg-emerald-500'
                          : m.status === 'SUSPENDIDO'
                          ? 'bg-rose-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    {m.status}
                  </span>
                </td>

                {/* Acciones */}
                <td
                  className="py-3.5 px-4 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/personal/${m.id}`)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                      title="Ver perfil completo"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onManageAccess(m)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                      title="Gestionar acceso al sistema"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleStatus(m)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        m.status === 'ACTIVO'
                          ? 'hover:bg-rose-50 text-slate-500 hover:text-rose-600'
                          : 'hover:bg-emerald-50 text-slate-500 hover:text-emerald-600'
                      }`}
                      title={m.status === 'ACTIVO' ? 'Suspender o desactivar' : 'Reactivar'}
                    >
                      {m.status === 'ACTIVO' ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
