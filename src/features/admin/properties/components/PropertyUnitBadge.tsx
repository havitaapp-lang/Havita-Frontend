import React from 'react';
import type { PropertyUnit } from '../../../../types';
import { cn } from '../../../../utils/cn';
import { getStatusLabel } from '../../../../utils/statusLabels';

interface PropertyUnitBadgeProps {
  property: PropertyUnit;
  onSelect: (property: PropertyUnit) => void;
  isSelected?: boolean;
}

export const PropertyUnitBadge: React.FC<PropertyUnitBadgeProps> = ({
  property,
  onSelect,
  isSelected,
}) => {
  const isOccupied = property.status === 'OCCUPIED';
  const isVacant = property.status === 'VACANT';
  const isMaintenance = property.status === 'MAINTENANCE';

  return (
    <button
      type="button"
      onClick={() => onSelect(property)}
      className={cn(
        "group relative flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer min-w-[100px] sm:min-w-[120px] flex-1",
        isSelected 
          ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/40 shadow-sm"
          : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs hover:scale-[1.02]",
        isOccupied && !isSelected && "hover:border-emerald-300",
        isVacant && !isSelected && "hover:border-amber-300 bg-amber-50/20",
        isMaintenance && !isSelected && "hover:border-orange-300 bg-orange-50/20"
      )}
      title={property.name + ' - ' + getStatusLabel(property.status)}
    >
      {/* Top: Unit number and status indicator */}
      <div className="w-full flex items-center justify-between gap-1.5 mb-1">
        <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
          {property.name.replace(/(Apto|Casa)\s+/i, '')}
        </span>
        
        {/* Status Dot */}
        <span 
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            isOccupied && "bg-emerald-500",
            isVacant && "bg-amber-400 ring-2 ring-amber-100",
            isMaintenance && "bg-orange-500 ring-2 ring-orange-100",
            property.status === 'INACTIVE' && "bg-slate-300"
          )}
          aria-label={getStatusLabel(property.status)}
        />
      </div>

      {/* Resident Name or Status Label */}
      <div className="w-full text-[11px] truncate">
        {property.residentName ? (
          <span className="text-slate-600 font-medium truncate block">
            {property.residentName.split(' ')[0]} {property.residentName.split(' ')[1]?.[0] || ''}.
          </span>
        ) : (
          <span className={cn(
            "font-semibold block",
            isVacant && "text-amber-700",
            isMaintenance && "text-orange-700",
            property.status === 'INACTIVE' && "text-slate-400"
          )}>
            {getStatusLabel(property.status)}
          </span>
        )}
      </div>

      {/* Small metadata: area */}
      {property.area && (
        <span className="text-[10px] text-slate-400 mt-1 font-mono">
          {property.area} m²
        </span>
      )}
    </button>
  );
};
