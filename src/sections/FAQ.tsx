import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const FAQ: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: '¿Cómo funciona la citofonía virtual y reemplaza los cables viejos?',
      a: 'Sí, totalmente. Havita utiliza tecnología de audio en tiempo real WebRTC respaldada por Cloudflare. La portería realiza la llamada desde una tablet o computador, y el residente la contesta directamente en su teléfono celular. Elimina de raíz los costosos contratos de mantenimiento de cableado físico de citófonos tradicionales.'
    },
    {
      q: '¿Las votaciones de asambleas tienen validez legal bajo la Ley 675?',
      a: 'Absolutamente. El módulo de asambleas calcula el quórum y pondera cada voto según el coeficiente de copropiedad estipulado en la escritura pública del conjunto. Al finalizar cada votación, el sistema genera un reporte detallado e inmutable listo para anexar al acta oficial de la asamblea.'
    },
    {
      q: '¿Cómo migramos los datos si actualmente manejamos todo en Excel?',
      a: 'Nuestro equipo de soporte se encarga del 100% de la carga inicial de datos sin costo. Solo nos compartes tus archivos de Excel con el censo de unidades, propietarios y coeficientes, y los estructuramos en tu espacio privado de Havita en menos de 48 horas.'
    },
    {
      q: '¿Los residentes deben descargar una app pesada en su teléfono?',
      a: 'No. Havita opera como una Progressive Web App (PWA) de última generación. Los residentes reciben un enlace o escanean un código QR, acceden instantáneamente y pueden agregar el ícono a su pantalla de inicio como una app nativa, recibiendo notificaciones push sin ocupar almacenamiento en su dispositivo.'
    },
    {
      q: '¿Qué garantía tenemos de la seguridad y privacidad de la información?',
      a: 'Cada copropiedad cuenta con un esquema de base de datos aislada (multi-tenant) sobre PostgreSQL y protección perimetral contra ataques de Cloudflare. Además, todos los tratamientos de datos cumplen con la Ley Estatutaria 1581 de 2012 (Habeas Data) en Colombia.'
    },
    {
      q: '¿Qué tipo de soporte técnico reciben los administradores y guardas?',
      a: 'Cuentas con una línea directa de atención prioritaria por WhatsApp para resolver dudas en tiempo real, capacitación guiada para el personal de portería y acompañamiento especializado durante asambleas generales.'
    }
  ];

  return (
    <section id="faq" className="py-20 sm:py-28 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            Preguntas Frecuentes de Consejos y Administradores
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#16345F] tracking-tight">
            Todo lo que necesitas saber antes de comenzar
          </h2>
          <p className="text-base text-slate-500 max-w-xl mx-auto mt-2">
            Respuestas claras a las dudas más comunes de consejos de administración y comités de convivencia.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            const answerId = `faq-answer-${idx}`;
            const questionId = `faq-question-${idx}`;

            return (
              <div 
                key={idx}
                className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                  isOpen ? 'border-blue-300 shadow-sm bg-slate-50/40' : 'border-[#E5EAF0] hover:border-slate-300'
                }`}
              >
                <button
                  id={questionId}
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  className="w-full py-5 px-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <span className="text-base font-bold text-[#16345F]">
                    {faq.q}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'transform rotate-180 text-blue-600' : ''
                  }`} />
                </button>

                {isOpen && (
                  <div 
                    id={answerId}
                    role="region"
                    aria-labelledby={questionId}
                    className="px-6 pb-6 pt-1 text-sm text-[#667085] leading-relaxed border-t border-slate-200/50"
                  >
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
