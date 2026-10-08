import React from 'react';
import havitaLogo from '../assets/havita-logo.png';

interface LogoProps {
  className?: string;
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  variant = 'dark',
  size = 'md' 
}) => {
  const imageHeights = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10'
  };

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img 
        src={havitaLogo} 
        alt="Havita Logo" 
        className={`${imageHeights[size]} w-auto object-contain`}
        draggable={false}
      />
    </div>
  );
};
