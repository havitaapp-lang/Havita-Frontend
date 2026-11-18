import React from 'react';
import { Laptop, Smartphone, CheckCircle2, ShieldCheck, PhoneCall, QrCode, Vote, Package, Clock, ArrowRight } from 'lucide-react';

interface DualPlatformShowcaseProps {
  onOpenDemo?: (context?: string) => void;
}

export const DualPlatformShowcase: React.FC<DualPlatformShowcaseProps> = ({ onOpenDemo }) => {
  return (
    <section id="dual-platform" className="py-20 sm:py-28 bg-[#F8FAFC] border-y border-slate-200/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Ecosistema Sincronizado en Tiempo Real
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-black text-[#16345F] tracking-tight mb-4 leading-tight">
            Una sola plataforma. Dos experiencias perfectamente conectadas.
          </h2>
          <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
            Todo el control, auditoría y trazabilidad que necesita la administración en su computador, integrado en vivo con la app ligera que usan los residentes y el personal de portería.
          </p>
        </div>

        {/* Dual Cards Grid (2 columns on md/lg) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* CARD 1: Panel Web para Administración y Consejo */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-md hover:shadow-xl transition-all flex flex-col justify-between relative overflow-hidden group">
            {/* Ambient accent top bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
            
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                  <Laptop className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  Panel de Administración Web
                </span>
              </div>

              <h3 className="text-2xl font-black text-[#16345F] mb-3">
                Control Operativo, Financiero y Jurídico
              </h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Diseñado para administradores profesionales y consejos de copropietarios que necesitan orden, trazabilidad legal y reportes confiables sin complicaciones.
              </p>

              {/* Feature Highlights */}
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#16345F]">Asambleas con Quórum Automático (Ley 675)</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Cálculo ponderado en tiempo real según coeficientes de escritura pública y generación inmutable de actas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#16345F]">Radicado de PQRS con Tiempos de Respuesta</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Numeración consecutiva, clasificación automática y semáforo de vencimiento legal para blindar a la administración.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#16345F]">Bitácora de Portería y Registro de Turnos</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Seguimiento de asistencia del personal de vigilancia, novedades de relevo y registro digital de incidentes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#16345F]">Comunicados Push con Confirmación</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Publicación de boletines y avisos de corte con confirmación de lectura de propietarios y residentes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Accesible desde Chrome, Edge y Safari</span>
              <button
                onClick={() => onOpenDemo?.('Panel de Administración Web')}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1.5 group-hover:translate-x-1 transition-transform cursor-pointer"
              >
                <span>Ver demo del panel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CARD 2: App PWA para Residentes y Portería */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-md hover:shadow-xl transition-all flex flex-col justify-between relative overflow-hidden group">
            {/* Ambient accent top bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                  <Smartphone className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  App PWA para Residentes & Portería
                </span>
              </div>

              <h3 className="text-2xl font-black text-[#16345F] mb-3">
                Citofonía sin Cables y Autogestión Móvil
              </h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Una Progressive Web App ligera que no satura la memoria del celular, no requiere descargas lentas en tiendas y funciona en cualquier teléfono inteligente.
              </p>

              {/* Feature Highlights */}
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#16345F]">Citofonía Virtual WebRTC Directa</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Llamadas de audio claras entre portería y celular con Cloudflare. Cero cables viejos y cero costos de mantenimiento físico.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#16345F]">Pases de Visita QR en 5 Segundos</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Los residentes crean invitaciones temporales para amigos y domiciliarios. En portería se validan con escáner al instante.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#16345F]">Alerta Push de Encomiendas y Paquetes</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Notificación automática con foto y código de retiro en cuanto el guarda recibe una entrega en recepción.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#16345F]">Reservas de Zonas Comunes 24/7</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Salón social, BBQ y zonas deportivas con calendario en tiempo real, reglas de uso y confirmación sin planillas en papel.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Compatible con iOS y Android sin descargas</span>
              <button
                onClick={() => onOpenDemo?.('App PWA para Residentes & Portería')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 group-hover:translate-x-1 transition-transform cursor-pointer"
              >
                <span>Probar experiencia móvil</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
