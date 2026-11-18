import { STATUS_HINTS, STATUS_LABELS, type ProxyStatus } from '../proxyTypes';

const STYLES: Record<ProxyStatus, string> = {
  PENDING_REVIEW: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  USED: 'bg-blue-50 text-blue-800 border-blue-200',
  REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
  REVOKED: 'bg-slate-100 text-slate-700 border-slate-200',
  EXPIRED: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const ProxyStatusBadge = ({ status }: { status: ProxyStatus }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${STYLES[status]}`}
    title={STATUS_HINTS[status]}
    data-testid="proxy-status"
    data-status={status}
  >
    {STATUS_LABELS[status]}
  </span>
);
