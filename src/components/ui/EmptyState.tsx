import React from 'react';
import { type LucideIcon, Inbox } from 'lucide-react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  secondaryAction,
  className,
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 max-w-lg mx-auto my-6",
      className
    )}>
      <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-400 mb-4 ring-8 ring-slate-100/50">
        <Icon className="w-7 h-7 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 tracking-tight mb-1.5">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      
      {(actionLabel || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            >
              {secondaryAction.label}
            </button>
          )}
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-2"
            >
              <span>+</span>
              <span>{actionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
