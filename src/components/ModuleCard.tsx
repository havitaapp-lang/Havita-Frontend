import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface ModuleCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  theme: 'blue' | 'emerald' | 'amber' | 'purple' | 'cyan' | 'rose' | 'indigo' | 'violet';
  title: string;
  description: string;
  badge?: string;
  visualGraphic?: React.ReactNode;
  onClick?: () => void;
}

const themeHoverClassMap: Record<string, string> = {
  blue: 'group-hover:bg-blue-600',
  emerald: 'group-hover:bg-emerald-600',
  amber: 'group-hover:bg-amber-600',
  purple: 'group-hover:bg-purple-600',
  cyan: 'group-hover:bg-cyan-600',
  rose: 'group-hover:bg-rose-600',
  indigo: 'group-hover:bg-indigo-600',
  violet: 'group-hover:bg-violet-600',
};

const badgeThemeMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200/60',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/60',
  purple: 'bg-purple-50 text-purple-700 border-purple-200/60',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
  rose: 'bg-rose-50 text-rose-700 border-rose-200/60',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
  violet: 'bg-violet-50 text-violet-700 border-violet-200/60',
};

export const ModuleCard: React.FC<ModuleCardProps> = ({
  icon,
  iconBg,
  iconColor,
  theme,
  title,
  description,
  badge,
  visualGraphic,
  onClick
}) => {
  const hoverClass = themeHoverClassMap[theme] || 'group-hover:bg-blue-600';
  const badgeStyle = badgeThemeMap[theme] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div 
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="group relative bg-white rounded-3xl p-6 border border-[#E5EAF0] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_-6px_rgba(22,52,95,0.09)] hover:border-blue-200 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
    >
      {/* Top Header with Icon and Graphic */}
      <div>
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

        {/* Optional Badge */}
        {badge && (
          <div className="mb-2.5">
            <span className={`inline-block text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md border ${badgeStyle}`}>
              {badge}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="mb-5">
          <h3 className="text-lg font-bold text-[#16345F] mb-2 tracking-tight group-hover:text-blue-600 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-[#667085] leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Bottom Circle Arrow Button */}
      <div className="mt-auto pt-2 flex items-center justify-between border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-700 transition-colors">
          Explorar módulo
        </span>
        <div className={`w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center transition-all duration-300 ${hoverClass} group-hover:text-white group-hover:translate-x-1 shadow-xs`}>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
