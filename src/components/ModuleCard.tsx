import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface ModuleCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  arrowHoverBg: string;
  title: string;
  description: string;
  visualGraphic?: React.ReactNode;
  onClick?: () => void;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  icon,
  iconBg,
  iconColor,
  arrowHoverBg,
  title,
  description,
  visualGraphic,
  onClick
}) => {
  return (
    <div 
      onClick={onClick}
      className="group relative bg-white rounded-3xl p-6 border border-[#E5EAF0] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_-6px_rgba(22,52,95,0.08)] hover:border-slate-300/80 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
    >
      {/* Top Header with Icon and Graphic */}
      <div className="flex items-start justify-between gap-3 mb-4">
        {/* Main circular colored icon */}
        <div className={`w-12 h-12 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}>
          {icon}
        </div>

        {/* Visual Graphic thumbnail on the top right */}
        {visualGraphic && (
          <div className="shrink-0 group-hover:scale-105 transition-transform duration-300">
            {visualGraphic}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 mb-5">
        <h3 className="text-lg font-bold text-[#16345F] mb-2 tracking-tight group-hover:text-[var(--tenant-primary)] transition-colors">
          {title}
        </h3>
        <p className="text-sm text-[#667085] leading-relaxed">
          {description}
        </p>
      </div>

      {/* Bottom Circle Arrow Button */}
      <div className="mt-auto pt-1">
        <div className={`w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center transition-all duration-300 group-hover:${arrowHoverBg} group-hover:text-white group-hover:translate-x-1 shadow-xs`}>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
