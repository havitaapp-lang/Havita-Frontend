import { getStatusLabel } from '../../utils/statusLabels';
import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Package as PackageIcon, CheckCircle2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';
import { FIELD_LIMITS } from '../../validation/rules/limits';

export const ResidentPackages = () => {
  const { user, activePropertyId, userProperties } = useAuth() as any;
  const { packages, markPackageDelivered } = useData();
  const activeProperty = userProperties?.find((prop: any) => prop.propertyId === activePropertyId);
  const myPackages = packages.filter(p => {
    if (activePropertyId && (p.propertyId === activePropertyId)) return true;
    if (activeProperty?.number && (p.propertyId === activeProperty.number || (p as any).propertyNumber === activeProperty.number)) return true;
    if (activeProperty?.name && (p.propertyId === activeProperty.name || (p as any).propertyName === activeProperty.name)) return true;
    if (!activePropertyId && user?.residentPropertyId && p.propertyId === user.residentPropertyId) return true;
    if (!activePropertyId && user?.propertyUnit && (p.propertyId === user.propertyUnit || (p as any).propertyNumber === user.propertyUnit)) return true;
    return false;
  });

  const [tab, setTab] = useState<'Pendientes' | 'Historial'>('Pendientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const filtered = myPackages.filter(p => {
    const matchesSearch = !searchTerm || 
      p.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.trackingNumber && p.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTab = tab === 'Pendientes' ? p.status !== 'DELIVERED' : p.status === 'DELIVERED';
    return matchesSearch && matchesTab;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedPackages = filtered.slice((validCurrentPage - 1) * ITEMS_PER_PAGE, validCurrentPage * ITEMS_PER_PAGE);

  const handleConfirmPickup = async (id: string, company: string) => {
    const confirmed = await notificationService.showConfirm(
      '¿Confirmar entrega?',
      `¿Confirmas que ya retiraste el paquete de ${company} en portería?`,
      'Sí, ya lo recibí',
      'Cancelar'
    );

    if (confirmed) {
      markPackageDelivered(id);
      notificationService.showToast('Entrega confirmada', 'success');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-10">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Mis Paquetes y Encomiendas</h2>
        <p className="text-slate-500 text-xs">Consulta la correspondencia recibida en portería para tu apartamento.</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="search"
          maxLength={FIELD_LIMITS.SEARCH_MAX_LENGTH}
          placeholder="Buscar por empresa transportadora o guía..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => {
            setTab('Pendientes');
            setCurrentPage(1);
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tab === 'Pendientes'
              ? 'bg-[var(--tenant-primary)] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          Por Reclamar ({myPackages.filter(p => p.status !== 'DELIVERED').length})
        </button>
        <button
          onClick={() => {
            setTab('Historial');
            setCurrentPage(1);
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tab === 'Historial'
              ? 'bg-[var(--tenant-primary)] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          Historial Entregados ({myPackages.filter(p => p.status === 'DELIVERED').length})
        </button>
      </div>

      {/* Packages list */}
      <div className="space-y-3">
        {paginatedPackages.map((pkg) => (
          <Card key={pkg.id} className="p-4 rounded-2xl border border-slate-200/80 shadow-xs bg-white flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  pkg.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  <PackageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{pkg.company}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Para: {pkg.recipientName}</p>
                  {pkg.trackingNumber && (
                    <p className="text-[10px] font-mono text-slate-400 mt-1">Guía: {pkg.trackingNumber}</p>
                  )}
                  {pkg.observations && (
                    <p className="text-[11px] text-slate-600 italic mt-1">{pkg.observations}</p>
                  )}
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                pkg.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {getStatusLabel(pkg.status)}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
              <div className="text-[11px] text-slate-400">
                Llegó: {pkg.receivedAt}
              </div>

              {pkg.status !== 'DELIVERED' && (
                <button
                  onClick={() => handleConfirmPickup(pkg.id, pkg.company)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ya lo reclamé
                </button>
              )}
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            <PackageIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No tienes paquetes {tab.toLowerCase()}.</p>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-3xl border border-slate-200/80 shadow-xs mt-4">
            <span className="text-xs text-slate-500 font-medium">
              Mostrando {(validCurrentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(validCurrentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length} paquetes
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={validCurrentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 min-w-[2rem] text-center">
                {validCurrentPage} / {totalPages}
              </span>
              <button
                disabled={validCurrentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


