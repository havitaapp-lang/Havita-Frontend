import React from 'react';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { focusField } from '../../validation/validators/formValidator';

interface FormErrorSummaryProps {
  errors: Array<{ field: string; message: string }>;
  title?: string;
}

export const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({
  errors,
  title,
}) => {
  if (!errors || errors.length === 0) return null;

  const summaryTitle =
    title ||
    `Hay ${errors.length} ${errors.length === 1 ? 'campo que debes revisar' : 'campos que debes revisar'}:`;

  return (
    <div
      role="alert"
      aria-atomic="true"
      className="mb-4 rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-900 animate-in fade-in slide-in-from-top-1 duration-200"
    >
      <div className="flex items-center gap-2 font-semibold text-rose-800 mb-1.5">
        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
        <span>{summaryTitle}</span>
      </div>
      <ul className="space-y-1 pl-6 list-disc">
        {errors.map((err, idx) => (
          <li key={`${err.field}-${idx}`} className="text-rose-700">
            <button
              type="button"
              onClick={() => focusField(err.field)}
              className="text-left font-medium hover:underline hover:text-rose-900 cursor-pointer inline-flex items-center gap-1 group"
            >
              <span>{err.message}</span>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
