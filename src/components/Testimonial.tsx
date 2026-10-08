import React, { useState } from 'react';
import { Quote } from 'lucide-react';

export const Testimonial: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const testimonials = [
    {
      quote: "Havita nos ha permitido reducir en un 70% las llamadas y mensajes por WhatsApp. La comunicación con los residentes ahora es mucho más clara y organizada.",
      name: "María Fernanda López",
      role: "Administradora · Limonar Parque Residencial",
      city: "Cali",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
    },
    {
      quote: "El registro de visitas en portería con código QR eliminó las filas en horas pico. Los vigilantes ahora tienen una herramienta rápida y sin papeles.",
      name: "Andrés Restrepo",
      role: "Jefe de Seguridad · Altos del Río",
      city: "Medellín",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80"
    },
    {
      quote: "La reserva de zonas comunes y el pago de administración desde la app del celular aumentó la satisfacción de los propietarios en más del 85%.",
      name: "Carolina Meza",
      role: "Consejo de Administración · Torres del Valle",
      city: "Bogotá",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80"
    }
  ];

  const current = testimonials[activeSlide];

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-stretch max-w-6xl mx-auto">
      
      {/* LEFT CARD: Community Trust & Building Photo */}
      <div className="flex-1 bg-white rounded-3xl p-3 border border-[#E5EAF0] shadow-sm flex flex-col sm:flex-row items-center gap-5 overflow-hidden">
        {/* Modern Residential Building Image */}
        <div className="relative w-full sm:w-[220px] h-[180px] sm:h-full min-h-[160px] rounded-2xl overflow-hidden shrink-0 shadow-xs">
          <img 
            src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80" 
            alt="Conjunto Residencial Moderno"
            className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <span className="absolute bottom-2.5 left-3 text-[10px] text-white/90 font-medium backdrop-blur-xs px-2 py-0.5 rounded-md bg-black/20">
            Limonar Parque
          </span>
        </div>

        {/* Text & Cities */}
        <div className="p-2 sm:pr-4 flex-1">
          <h3 className="text-xl sm:text-2xl font-black text-[#16345F] leading-tight tracking-tight mb-3">
            Más de 50<br />
            unidades residenciales<br />
            confían en Havita
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#667085] mb-5">
            <span>Medellín</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>Cali</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>Bogotá</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>Barranquilla</span>
          </div>

          {/* Interactive slider dots */}
          <div className="flex items-center gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                aria-label={`Ver testimonio ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  activeSlide === i 
                    ? 'w-6 bg-[var(--tenant-primary)]' 
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT CARD: Testimonial Quote */}
      <div className="flex-1 bg-[#F8FAFC] rounded-3xl p-7 sm:p-8 border border-[#E5EAF0] shadow-sm flex flex-col justify-between relative overflow-hidden">
        {/* Big quote decorative icon */}
        <div className="absolute top-6 right-6 text-blue-100/70 pointer-events-none">
          <Quote className="w-16 h-16 transform rotate-180" />
        </div>

        {/* Quote text */}
        <div className="relative z-10 mb-6">
          <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed italic">
            "{current.quote}"
          </p>
        </div>

        {/* Author Bio */}
        <div className="flex items-center gap-3.5 relative z-10 pt-4 border-t border-slate-200/60">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
            <img 
              src={current.avatar} 
              alt={current.name}
              className="w-full h-full object-cover" 
            />
          </div>
          <div>
            <div className="font-bold text-[#16345F] text-sm sm:text-base leading-tight">
              {current.name}
            </div>
            <div className="text-xs text-[#667085] font-medium mt-0.5">
              {current.role}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
