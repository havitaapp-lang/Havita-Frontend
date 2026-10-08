import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  hasSuccess?: boolean;
  theme?: 'light' | 'dark';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, hasError, hasSuccess, theme = 'light', ...props }, ref) => {
    const isError = hasError || props['aria-invalid'] === true || props['aria-invalid'] === 'true';

    const themeClasses =
      theme === 'dark'
        ? cn(
            'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/30',
            isError && 'border-rose-500/80 bg-rose-950/20 focus:border-rose-500 focus:ring-rose-500/30',
            hasSuccess && !isError && 'border-emerald-500/80 focus:border-emerald-500 focus:ring-emerald-500/30'
          )
        : cn(
            'bg-slate-50 focus:bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-(--tenant-primary) focus:ring-(--tenant-primary)/20',
            isError && 'border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-500/20',
            hasSuccess && !isError && 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20'
          );

    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border px-3.5 py-2 text-sm transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 read-only:opacity-75 read-only:cursor-default',
          themeClasses,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };

