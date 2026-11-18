import React from 'react';
import { PhoneOff, Vote, FileX, MessageSquareOff, CheckCircle2, ArrowRight } from 'lucide-react';

interface ProblemsSolvedProps {
  onOpenDemo?: (topic?: string) => void;
}

export const ProblemsSolved: React.FC<ProblemsSolvedProps> = ({ onOpenDemo }) => {
  const problems = [
    {
      problemIcon: PhoneOff,
      problemTitle: 'Cables de citófono obsoletos y reparaciones de 20 millones',
      problemDesc: 'Aparatos dañados en los apartamentos, quejas continuas de residentes y cotizaciones millonarias de obra civil que ningún consejo quiere aprobar.',
      solutionTitle: 'Citofonía Virtual WebRTC en la Nube',
      solutionDesc: 'Llamadas de voz nítidas entre portería y el celular del residente. Cero cables físicos, cero aparatos que se descompongan y ahorro total en contratos de cableado.',
      highlight: 'Ahorro de hasta el 80% en costos de citofonía'
    },
    {
      problemIcon: Vote,
      problemTitle: 'Asambleas caóticas y discusiones interminables de quórum',
      problemDesc: 'Horas contando papeletas a mano, dudas sobre poderes delegados y disputas sobre coeficientes que ponen en riesgo la validez jurídica de las actas.',
      solutionTitle: 'Quórum Automático y Votación Digital (Ley 675)',
      solutionDesc: 'El sistema calcula el quórum en vivo ponderando cada voto por el coeficiente registrado en la escritura. Genera reporte auditable e inmutable al instante.',
      highlight: 'Asambleas un 60% más rápidas y con validez jurídica'
    },
    {
      problemIcon: FileX,
      problemTitle: 'Cuadernos de papel en portería y encomiendas perdidas',
      problemDesc: 'Planillas físicas ilegibles, demoras registrando cédulas a mano en horas pico y paquetes acumulados en recepción sin que el residente sepa que llegaron.',
      solutionTitle: 'Pases QR y Alertas Push de Paquetería',
      solutionDesc: 'El residente genera un código QR para sus visitas validado en segundos en portería. Al recibir un paquete, el guarda envía alerta push instantánea con foto.',
      highlight: 'Control de acceso en 5 segundos y cero paquetes extraviados'
    },
    {
      problemIcon: MessageSquareOff,
      problemTitle: 'WhatsApp personal del administrador saturado a medianoche',
      problemDesc: 'Mensajes desordenados en el chat personal, quejas sin radicado que se olvidan y reclamos de residentes que afirman no haber sido informados.',
      solutionTitle: 'Radicado Formal de PQRS y Muro Institucional',
      solutionDesc: 'Cada requerimiento tiene número consecutivo, tiempo límite de respuesta y trazabilidad. Los comunicados oficiales llegan por notificación push con acuse de lectura.',
      highlight: 'Respeto al horario laboral y blindaje administrativo'
    }
  ];

  return (
    <section id="problems-solved" className="py-20 sm:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200/60 text-rose-700 text-xs font-semibold mb-4">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            Problemas Reales de Copropiedades en Colombia
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-black text-[#16345F] tracking-tight mb-4 leading-tight">
            Diseñado para solucionar los dolores cotidianos de tu conjunto
          </h2>
          <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
            Comparamos la realidad tradicional con la que sufren los administradores frente a la tranquilidad de operar con Havita.
          </p>
        </div>

        {/* 2x2 Problems vs Solutions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {problems.map((item, idx) => {
            const ProblemIcon = item.problemIcon;
            return (
              <div 
                key={idx} 
                className="rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* The Problem (Before) */}
                  <div className="pb-5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 text-rose-600 mb-2">
                      <ProblemIcon className="w-5 h-5 shrink-0" />
                      <span className="text-xs font-extrabold uppercase tracking-wider">El problema tradicional</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug mb-2">
                      {item.problemTitle}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                      {item.problemDesc}
                    </p>
                  </div>

                  {/* The Solution (With Havita) */}
                  <div className="pt-5">
                    <div className="flex items-center gap-2 text-emerald-600 mb-2">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span className="text-xs font-extrabold uppercase tracking-wider">La solución con Havita</span>
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-[#16345F] leading-snug mb-2">
                      {item.solutionTitle}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {item.solutionDesc}
                    </p>
                  </div>
                </div>

                {/* Highlight Tag */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#10B981] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    {item.highlight}
                  </span>
                  <button
                    onClick={() => onOpenDemo?.(item.solutionTitle)}
                    className="text-xs font-bold text-[#16345F] hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Conocer más</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
