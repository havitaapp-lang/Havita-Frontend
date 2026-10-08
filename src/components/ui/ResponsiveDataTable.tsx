import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight,
  ArrowUpDown, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  priority?: 'high' | 'medium' | 'low'; // high: always show; medium: tablet+; low: desktop only
  className?: string;
}

interface ResponsiveDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  renderMobileCard: (item: T) => React.ReactNode;
  itemsPerPage?: number;
  filterComponent?: React.ReactNode;
  onRowClick?: (item: T) => void;
  emptyState?: React.ReactNode;
}

export function ResponsiveDataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  renderMobileCard,
  itemsPerPage = 8,
  filterComponent,
  onRowClick,
  emptyState,
}: ResponsiveDataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Handle Sort
  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return sortDirection === 'asc' 
        ? String(valA).localeCompare(String(valB)) 
        : String(valB).localeCompare(String(valA));
    });
  }, [data, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full space-y-3">
      {/* Optional Filters Row */}
      {filterComponent && (
        <div className="w-full">
          {filterComponent}
        </div>
      )}

      {/* 1. Mobile & Small Tablet Card-List View (< md: 768px) */}
      <div className="block md:hidden space-y-3">
        {paginatedData.length === 0 ? (
          emptyState || (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No se encontraron registros.
            </div>
          )
        ) : (
          paginatedData.map((item) => (
            <div 
              key={keyExtractor(item)} 
              onClick={() => onRowClick?.(item)}
              className={cn(
                "p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs transition-all active:scale-[0.99]",
                onRowClick && "cursor-pointer hover:border-slate-300"
              )}
            >
              {renderMobileCard(item)}
            </div>
          ))
        )}
      </div>

      {/* 2. Tablet & Desktop Structured Table (>= md: 768px) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              <tr>
                {columns.map((col, idx) => {
                  const isSorted = sortKey === col.accessorKey;
                  return (
                    <th
                      key={idx}
                      onClick={() => col.sortable && col.accessorKey && handleSort(col.accessorKey)}
                      className={cn(
                        "px-5 py-3.5",
                        col.sortable && "cursor-pointer select-none hover:text-slate-700",
                        col.priority === 'low' && "hidden xl:table-cell",
                        col.priority === 'medium' && "hidden lg:table-cell",
                        col.className
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="text-slate-400">
                            {isSorted ? (
                              sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 text-xs">
                    {emptyState || 'No se encontraron registros.'}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr
                    key={keyExtractor(item)}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      "hover:bg-slate-50/70 transition-colors",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {columns.map((col, cIdx) => (
                      <td
                        key={cIdx}
                        className={cn(
                          "px-5 py-4 text-slate-700",
                          col.priority === 'low' && "hidden xl:table-cell",
                          col.priority === 'medium' && "hidden lg:table-cell",
                          col.className
                        )}
                      >
                        {col.cell ? col.cell(item) : col.accessorKey ? String(item[col.accessorKey] ?? '') : null}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Universal Responsive Pagination Bar */}
      {sortedData.length > 0 && (
        <div className="p-3 sm:p-4 rounded-xl bg-white border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shadow-2xs">
          <span className="order-2 sm:order-1 text-center sm:text-left">
            Mostrando <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> a{' '}
            <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, sortedData.length)}</strong> de{' '}
            <strong className="text-slate-800">{sortedData.length}</strong> registros
          </span>

          <div className="order-1 sm:order-2 flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>
            <span className="px-2 font-bold text-slate-800">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer font-medium"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
