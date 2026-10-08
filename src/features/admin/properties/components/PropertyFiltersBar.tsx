import React from 'react';
import { LayoutGrid, List, Search, X } from 'lucide-react';
import { cn } from '../../../../utils/cn';

interface PropertyFiltersBarProps {
  viewMode: 'structure' | 'list';
  onViewModeChange: (mode: 'structure' | 'list') => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
}

export const PropertyFiltersBar: React.FC<PropertyFiltersBarProps> = ({
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-white rounded-2xl border border-slate-200 shadow-2xs">
      
      {/* View Selector Toggle [ ▦ Estructura ] [ ☷ Lista ] */}
      <div className="flex items-center p-1 bg-slate-100 rounded-xl shrink-0 self-start sm:self-auto">
        <button
          type="button"
          onClick={() => onViewModeChange('structure')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
            viewMode === 'structure'
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Estructura</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('list')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
            viewMode === 'list'
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <List className="w-4 h-4" />
          <span>Lista</span>
        </button>
      </div>

      {/* Global Search Bar & Filters */}
      <div className="flex flex-1 items-center gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar propiedad, torre o residente..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 shrink-0"
        >
          <option value="Todos">Todos los estados</option>
          <option value="OCCUPIED">Ocupadas</option>
          <option value="VACANT">Vacantes</option>
          <option value="MAINTENANCE">Mantenimiento</option>
          <option value="INACTIVE">Inactivas</option>
        </select>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className="hidden md:block px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 shrink-0"
        >
          <option value="Todos">Todos los tipos</option>
          <option value="Apartamento">Apartamentos</option>
          <option value="Casa">Casas</option>
          <option value="Local">Locales</option>
          <option value="Parqueadero">Parqueaderos</option>
        </select>
      </div>

    </div>
  );
};
