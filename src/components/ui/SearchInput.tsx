import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  debounceMs = 300,
  className,
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [localValue, debounceMs, onChange, value]);

  return (
    <div className={cn("relative flex items-center w-full max-w-sm", className)}>
      <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
      />
      {localValue && (
        <button
          type="button"
          onClick={() => {
            setLocalValue('');
            onChange('');
          }}
          className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
