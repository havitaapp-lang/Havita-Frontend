import React from 'react';
import { Testimonial } from '../components/Testimonial';

interface SocialProofProps {
  onOpenDemo?: () => void;
}

export const SocialProof: React.FC<SocialProofProps> = ({ onOpenDemo }) => {
  return (
    <section id="pioneer-program" className="py-20 sm:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Subtle section label */}
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/60 px-3.5 py-1 rounded-full">
            Confianza, Garantías y Respaldo Institucional
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#16345F] mt-3 tracking-tight">
            Diseñado para la realidad de la propiedad horizontal en Colombia
          </h2>
          <p className="text-base text-slate-500 max-w-2xl mx-auto mt-2">
            Elimina riesgos legales y dolores de cabeza operativos con una plataforma construida en cumplimiento de las leyes colombianas.
          </p>
        </div>

        {/* Pioneer Program & Compliance Component */}
        <Testimonial onOpenDemo={onOpenDemo} />

      </div>
    </section>
  );
};
