import React, { useState } from 'react';
import { 
  Home, User, Edit, Trash2, Download, CheckSquare, 
  Square, ChevronLeft, ChevronRight 
} from 'lucide-react';
import type { PropertyUnit } from '../../../../types';
import { Badge } from '../../../../components/ui/Badge';
import { propertiesService } from '../../../../services/propertiesService';
import { notificationService } from '../../../../services/notificationService';
import { cn } from '../../../../utils/cn';
import { getStatusLabel } from '../../../../utils/statusLabels';

interface PropertyListViewProps {
  properties: PropertyUnit[];
  onEdit: (property: PropertyUnit) => void;
  onDelete: (id: string, name: string) => void;
  onSelectProperty: (property: PropertyUnit) => void;
}

const ITEMS_PER_PAGE = 10;

export const PropertyListView: React.FC<PropertyListViewProps> = ({
  properties,
  onEdit,
  onDelete,
  onSelectProperty,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const totalPages = Math.ceil(properties.length / ITEMS_PER_PAGE) || 1;
  const paginated = properties.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleToggleAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((p) => p.id)));
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleExportCsv = () => {
    const csvContent = propertiesService.exportToCsv(properties);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'propiedades_havita_' + Date.now() + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notificationService.showToast('Archivo CSV exportado exitosamente', 'success');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      
      {/* Batch Actions Bar */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleAll}
            className="flex items-center gap-2 text-slate-600 font-semibold hover:text-slate-900 cursor-pointer"
          >
            {selectedIds.size === paginated.length && paginated.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>Seleccionar página ({paginated.length})</span>
          </button>

          {selectedIds.size > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
              {selectedIds.size} seleccionadas
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium transition-colors shadow-2xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-10 px-4 py-3.5 text-center">#</th>
              <th className="px-4 py-3.5">Unidad</th>
              <th className="px-4 py-3.5">Ubicación / Estructura</th>
              <th className="px-4 py-3.5">Tipo</th>
              <th className="px-4 py-3.5">Residente</th>
              <th className="px-4 py-3.5">Estado</th>
              <th className="px-4 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                  No se encontraron propiedades con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              paginated.map((prop) => {
                const isChecked = selectedIds.has(prop.id);
                return (
                  <tr 
                    key={prop.id} 
                    className={cn(
                      "hover:bg-slate-50/70 transition-colors",
                      isChecked && "bg-blue-50/30"
                    )}
                  >
                    <td className="px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleRow(prop.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => onSelectProperty(prop)}
                        className="flex items-center gap-2.5 font-bold text-slate-900 hover:text-blue-600 transition-colors text-left cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Home className="w-3.5 h-3.5" />
                        </div>
                        <span>{prop.name}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {prop.path}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className="text-xs">{prop.type}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      {prop.residentName ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {prop.residentName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Vacante</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                        prop.status === 'OCCUPIED' && "bg-emerald-50 text-emerald-700",
                        prop.status === 'VACANT' && "bg-amber-50 text-amber-700",
                        prop.status === 'MAINTENANCE' && "bg-orange-50 text-orange-700",
                        prop.status === 'INACTIVE' && "bg-slate-100 text-slate-600"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          prop.status === 'OCCUPIED' && "bg-emerald-500",
                          prop.status === 'VACANT' && "bg-amber-500",
                          prop.status === 'MAINTENANCE' && "bg-orange-500",
                          prop.status === 'INACTIVE' && "bg-slate-400"
                        )} />
                        {getStatusLabel(prop.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(prop)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(prop.id, prop.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {properties.length > 0 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>
            Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, properties.length)} de {properties.length} propiedades
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
