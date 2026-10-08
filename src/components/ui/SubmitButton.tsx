import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './Button';

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isSubmitting?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  className?: string;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isSubmitting = false,
  loadingText = 'Guardando...',
  children,
  variant = 'default',
  className = '',
  disabled,
  ...props
}) => {
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={disabled || isSubmitting}
      className={`relative inline-flex items-center justify-center gap-2 transition-all ${className}`}
      {...props}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
};
