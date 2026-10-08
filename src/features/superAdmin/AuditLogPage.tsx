import { useState, useEffect } from 'react';
import { Shield, Search, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import type { AuditEvent } from '../../types/superAdmin';

export const AuditLogPage = () => {
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState('ALL');

  useEffect(() => {
    superAdminService.getAuditLog().then(setAuditLog);
  }, []);

  const filteredLog = auditLog.filter(log => {
    const q = search.toLowerCase();
    const matchSearch =
      log.action.toLowerCase().includes(q) ||
      log.actorName.toLowerCase().includes(q) ||
      (log.tenantName && log.tenantName.toLowerCase().includes(q)) ||
      log.resource.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q);
    const matchResource = resourceFilter === 'ALL' || log.resource === resourceFilter;
    return matchSearch && matchResource;
  });

  const getResultBadge = (result: 'Éxito' | 'Advertencia' | 'Error') => {
    switch (result) {
      case 'Éxito':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" /> Éxito
          </span>
        );
      case 'Advertencia':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> Advertencia
          </span>
        );
      case 'Error':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" /> Error
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-800 space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-400" />
          Audit Log
        </h1>
        <p className="text-xs text-slate-400">
          Bitácora inmutable de eventos administrativos, cambios de planes, suspensiones y accesos en modo soporte.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Todos los Recursos</option>
            <option value="Comunidades">Comunidades</option>
            <option value="Suscripciones">Suscripciones</option>
            <option value="Planes">Planes</option>
            <option value="Features">Features</option>
            <option value="Organizaciones">Organizaciones</option>
            <option value="Usuarios Internos">Usuarios Internos</option>
          </select>
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por usuario, acción o comunidad..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Audit Log Table (Requerimiento 13 exacto) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Usuario</th>
                <th className="py-3.5 px-4">Acción</th>
                <th className="py-3.5 px-4">Recurso</th>
                <th className="py-3.5 px-4">Comunidad</th>
                <th className="py-3.5 px-4">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLog.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Fecha */}
                  <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                    {log.timestamp}
                  </td>

                  {/* Usuario */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">{log.actorName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{log.actorRole}</div>
                  </td>

                  {/* Acción */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-200">{log.action}</div>
                    <div className="text-[11px] text-slate-400 max-w-sm truncate" title={log.details}>
                      {log.details}
                    </div>
                  </td>

                  {/* Recurso */}
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold text-[11px]">
                      {log.resource}
                    </span>
                  </td>

                  {/* Comunidad */}
                  <td className="py-3 px-4 text-slate-300">
                    {log.tenantName ? (
                      <span className="font-medium text-white">{log.tenantName}</span>
                    ) : (
                      <span className="text-slate-500 italic">Plataforma Global</span>
                    )}
                  </td>

                  {/* Resultado */}
                  <td className="py-3 px-4">
                    {getResultBadge(log.result || 'Éxito')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLog.length === 0 && (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <p className="font-bold text-slate-200">No se encontraron registros de auditoría.</p>
          </div>
        )}
      </div>
    </div>
  );
};
