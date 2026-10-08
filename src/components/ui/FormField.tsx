import React, { useId } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { CharacterCounter } from './CharacterCounter';

interface FormFieldProps {
  id?: string;
  label: string;
  required?: boolean;
  error?: string;
  success?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
  counter?: React.ReactNode;
  maxLength?: number;
  currentLength?: number;
  alwaysShowCounter?: boolean;
  theme?: 'light' | 'dark';
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  required = false,
  error,
  success,
  helperText,
  children,
  className = '',
  counter,
  maxLength,
  currentLength,
  alwaysShowCounter = false,
  theme = 'light',
}) => {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;

  const describedBy = error
    ? errorId
    : helperText || success
    ? helperId
    : undefined;

  const enhancedChildren = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id: (children.props as Record<string, unknown>).id || fieldId,
        'aria-invalid':
          (children.props as Record<string, unknown>)['aria-invalid'] !== undefined
            ? (children.props as Record<string, unknown>)['aria-invalid']
            : Boolean(error),
        'aria-describedby':
          (children.props as Record<string, unknown>)['aria-describedby'] || describedBy,
      })
    : children;

  const renderedCounter =
    counter !== undefined ? (
      counter
    ) : typeof maxLength === 'number' && typeof currentLength === 'number' ? (
      <CharacterCounter
        current={currentLength}
        max={maxLength}
        alwaysVisible={alwaysShowCounter}
        theme={theme}
      />
    ) : null;

  const labelColor =
    theme === 'dark'
      ? 'text-xs font-medium text-slate-300'
      : 'text-xs font-semibold text-slate-700';

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={fieldId} className={`block ${labelColor}`}>
          {label}
          {required && (
            <span className="text-rose-500 ml-1 font-bold" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {renderedCounter && <div className="shrink-0">{renderedCounter}</div>}
      </div>

      <div className="relative">{enhancedChildren}</div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className={`text-[11px] font-medium flex items-center gap-1 mt-1 animate-in fade-in duration-150 ${
            theme === 'dark' ? 'text-rose-400' : 'text-rose-600'
          }`}
        >
          <AlertCircle className="w-3 h-3 shrink-0 text-rose-500" />
          <span>{error}</span>
        </p>
      ) : success ? (
        <p
          id={helperId}
          className={`text-[11px] font-medium flex items-center gap-1 mt-1 ${
            theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
          }`}
        >
          <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-500" />
          <span>{success}</span>
        </p>
      ) : helperText ? (
        <p
          id={helperId}
          className={`text-[11px] mt-1 ${
            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

