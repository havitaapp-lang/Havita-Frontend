import React from 'react';
import { CTA } from '../components/CTA';

interface FinalCTAProps {
  onOpenDemo?: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onOpenDemo }) => {
  return (
    <section className="py-12 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CTA onOpenDemo={onOpenDemo} />
      </div>
    </section>
  );
};
