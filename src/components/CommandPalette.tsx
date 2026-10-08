import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Package, ShieldCheck, Wrench, X, ArrowRight } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';
import { getStatusLabel } from '../utils/statusLabels';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { residents, packages, visitors, pqrsList } = useData();

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Fast search across in-memory collections
  const filteredResidents = q ? residents.filter(r => r.name.toLowerCase().includes(q) || r.propertyId.toLowerCase().includes(q)).slice(0, 3) : [];
  const filteredPackages = q ? packages.filter(p => p.recipientName.toLowerCase().includes(q) || (p.trackingNumber && p.trackingNumber.toLowerCase().includes(q))).slice(0, 3) : [];
  const filteredVisitors = q ? visitors.filter(v => v.name.toLowerCase().includes(q) || v.documentId.includes(q)).slice(0, 3) : [];
  const filteredRequests = q ? pqrsList.filter(r => r.title.toLowerCase().includes(q) || r.residentName.toLowerCase().includes(q)).slice(0, 3) : [];

  const handleSelect = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const hasResults = filteredResidents.length > 0 || filteredPackages.length > 0 || filteredVisitors.length > 0 || filteredRequests.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center animate-in fade-in duration-150">
      <div 
        className="fixed inset-0" 
        onClick={() => setIsOpen(false)} 
        aria-hidden="true" 
      />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Search header */}
        <div className="relative flex items-center px-4 py-3 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={'Buscar en ' + (currentTenant?.name || 'la copropiedad') + '... (Residentes, paquetes, visitas)'}
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            autoFocus
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="ml-2 text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
            ESC
          </span>
        </div>

        {/* Results / Navigation body */}
        <div className="max-h-80 overflow-y-auto p-2">
          {!q && (
            <div className="p-2 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                Accesos directos
              </p>
              <button
                onClick={() => handleSelect('/admin/residents')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg group transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-blue-500" />
                  Directorio de Residentes
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button
                onClick={() => handleSelect('/admin/packages')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg group transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-amber-500" />
                  Módulo de Paquetería
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button
                onClick={() => handleSelect('/admin/visitors')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg group transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Control de Visitantes
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button
                onClick={() => handleSelect('/admin/requests')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg group transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Wrench className="w-4 h-4 text-rose-500" />
                  PQRS y Daños de Infraestructura
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          )}

          {q && !hasResults && (
            <div className="py-8 text-center text-xs text-slate-500">
              No se encontraron resultados para &quot;<span className="font-semibold">{query}</span>&quot;
            </div>
          )}

          {q && hasResults && (
            <div className="space-y-3 p-1">
              {filteredResidents.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 pb-1">Residentes</p>
                  {filteredResidents.map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleSelect('/admin/residents')}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-blue-50/60 rounded-lg group"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{r.name}</span>
                        <span className="text-slate-400 ml-2">({r.propertyId})</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{r.phone}</span>
                    </button>
                  ))}
                </div>
              )}

              {filteredPackages.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 pb-1">Paquetería</p>
                  {filteredPackages.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSelect('/admin/packages')}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-amber-50/60 rounded-lg group"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{p.recipientName}</span>
                        <span className="text-slate-400 ml-2">({p.company})</span>
                      </div>
                      <span className="text-[11px] font-mono bg-slate-100 px-1.5 py-0.5 rounded">{p.propertyId}</span>
                    </button>
                  ))}
                </div>
              )}

              {filteredVisitors.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 pb-1">Visitantes</p>
                  {filteredVisitors.map(v => (
                    <button
                      key={v.id}
                      onClick={() => handleSelect('/admin/visitors')}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-emerald-50/60 rounded-lg group"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{v.name}</span>
                        <span className="text-slate-400 ml-2">CC: {v.documentId}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">{getStatusLabel(v.status)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>Navegar con teclado</span>
            <span>•</span>
            <span>Presiona <kbd className="font-mono bg-white border border-slate-200 px-1 rounded text-slate-600">Ctrl+K</kbd> en cualquier momento</span>
          </div>
          <span className="font-medium text-slate-600">{currentTenant?.name}</span>
        </div>
      </div>
    </div>
  );
};
