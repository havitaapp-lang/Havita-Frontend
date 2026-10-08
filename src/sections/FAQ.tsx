import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FAQ: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: '¿Cómo funciona la instalación y cuánto tiempo tarda?',
      a: 'La puesta en marcha es 100% en la nube. Cargamos la base de datos de tu conjunto (torres, apartamentos y residentes) en menos de 48 horas y realizamos una capacitación virtual o presencial al equipo de administración y portería.'
    },
    {
      q: '¿Los residentes deben descargar una app pesada en su teléfono?',
      a: 'No. Havita funciona como una Progressive Web App (PWA). Los residentes acceden mediante un enlace directo, pueden guardarla en su pantalla de inicio como una aplicación nativa y no ocupa memoria en sus teléfonos.'
    },
    {
      q: '¿Cómo se garantiza la seguridad y privacidad de los datos?',
      a: 'Toda la información viaja encriptada mediante protocolo SSL/TLS y se almacena en servidores de alta disponibilidad con copias de seguridad diarias, cumpliendo estrictamente con las leyes de protección de datos personales (Habeas Data).'
    },
    {
      q: '¿Se puede utilizar en tablets para la portería o recepción?',
      a: 'Sí. La interfaz de seguridad y portería está optimizada específicamente para pantallas táctiles de tablets Android o iPad, permitiendo registros ágiles con un solo toque y lectura rápida de códigos QR.'
    },
    {
      q: '¿Ofrecen soporte continuo y acompañamiento?',
      a: 'Totalmente. Cuentas con soporte técnico vía WhatsApp, llamada y correo electrónico, además de guías paso a paso y tutoriales para residentes y administradores.'
    }
  ];

  return (
    <section id="faq" className="py-20 sm:py-28 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--tenant-primary)] bg-blue-50 px-3 py-1 rounded-full">
            Resolvemos tus dudas
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#16345F] mt-3 tracking-tight">
            Preguntas frecuentes
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div 
                key={idx}
                className="border border-[#E5EAF0] rounded-2xl overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full py-5 px-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <span className="text-base font-bold text-[#16345F]">
                    {faq.q}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'transform rotate-180 text-[var(--tenant-primary)]' : ''
                  }`} />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-sm text-[#667085] leading-relaxed border-t border-slate-100/60 bg-slate-50/30">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
