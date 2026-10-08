import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  return (
    <nav aria-label="Navegación estructural" className={cn("flex items-center text-xs text-slate-500 py-1.5", className)}>
      <ol className="flex items-center space-x-1.5 sm:space-x-2">
        <li className="flex items-center">
          <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span className="sr-only">Inicio</span>
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center space-x-1.5 sm:space-x-2">
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              {item.path && !isLast ? (
                <Link
                  to={item.path}
                  className="font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn("font-medium", isLast ? "text-slate-900 font-semibold" : "text-slate-500")}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
