import { LogIn, LogOut } from 'lucide-react';
import type { Visitor } from '../../types';

/**
 * Quién autorizó el ingreso y quién registró la salida de una visita (portería y administración).
 * El backend solo envía estos nombres al personal; si no vienen, no se muestra nada.
 */
export const VisitorStaffTrail = ({ visitor, className = '' }: { visitor: Pick<Visitor, 'enteredByName' | 'exitedByName'>; className?: string }) => {
  if (!visitor.enteredByName && !visitor.exitedByName) return null;
  return (
    <div className={`space-y-0.5 text-[11px] text-slate-500 ${className}`} data-testid="visitor-staff-trail">
      {visitor.enteredByName && (
        <div className="flex items-center gap-1 min-w-0" title={`Ingreso autorizado por ${visitor.enteredByName}`}>
          <LogIn className="w-3 h-3 shrink-0 text-emerald-600" aria-hidden="true" />
          <span className="truncate">
            Autorizó: <span className="font-semibold text-slate-700">{visitor.enteredByName}</span>
          </span>
        </div>
      )}
      {visitor.exitedByName && (
        <div className="flex items-center gap-1 min-w-0" title={`Salida registrada por ${visitor.exitedByName}`}>
          <LogOut className="w-3 h-3 shrink-0 text-rose-600" aria-hidden="true" />
          <span className="truncate">
            Salida: <span className="font-semibold text-slate-700">{visitor.exitedByName}</span>
          </span>
        </div>
      )}
    </div>
  );
};
