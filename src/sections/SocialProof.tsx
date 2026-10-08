import React from 'react';
import { Testimonial } from '../components/Testimonial';

export const SocialProof: React.FC = () => {
  return (
    <section id="social-proof" className="py-20 sm:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Subtle section label */}
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--tenant-primary)] bg-blue-50 px-3 py-1 rounded-full">
            Prueba social y confianza
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#16345F] mt-3 tracking-tight">
            Comunidades que ya transformaron su día a día
          </h2>
        </div>

        {/* Testimonial & Metrics component */}
        <Testimonial />

      </div>
    </section>
  );
};
