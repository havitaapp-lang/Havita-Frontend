import React from 'react';
import { Cloud, Server, Database, ShieldCheck, Cpu, ArrowUpRight, Lock } from 'lucide-react';

export const TechStackTrust: React.FC = () => {
  return (
    <section id="infrastructure" className="py-20 bg-slate-50/80 text-slate-900 border-y border-slate-200/70 relative overflow-hidden">
      {/* Background radial gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-4">
            <Lock className="w-3.5 h-3.5" />
            Infraestructura y Proveedores Tecnológicos
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#16345F] mb-4">
            Construido sobre infraestructura global de nivel empresarial
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            La seguridad, disponibilidad y privacidad de tu copropiedad están respaldadas por los proveedores de nube y estándares tecnológicos más rigurosos de la industria.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Cloudflare */}
          <div className="group relative bg-white hover:bg-slate-50/60 border border-slate-200/90 hover:border-amber-400 rounded-3xl p-6 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <Cloud className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  Borde & Seguridad
                </span>
              </div>

              <h3 className="text-lg font-bold text-[#16345F] mb-2 flex items-center gap-1.5">
                Cloudflare
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
                Protección perimetral DDoS empresarial, CDN global para carga instantánea y WebRTC de ultra baja latencia con <strong>Cloudflare RealtimeKit</strong> para nuestra citofonía digital sin cables.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">DDoS Mitigation</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">RealtimeKit WebRTC</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">R2 Storage</span>
            </div>
          </div>

          {/* Railway */}
          <div className="group relative bg-white hover:bg-slate-50/60 border border-slate-200/90 hover:border-purple-400 rounded-3xl p-6 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
                  <Server className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
                  Cloud Compute
                </span>
              </div>

              <h3 className="text-lg font-bold text-[#16345F] mb-2 flex items-center gap-1.5">
                Railway
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
                Infraestructura backend de alta disponibilidad con contenedores aislados, escalado dinámico continuo, monitorización en vivo y despliegues sin tiempo de inactividad (Zero-Downtime).
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">99.9% Uptime</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">Isolated VPC</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">Auto-Scaling</span>
            </div>
          </div>

          {/* PostgreSQL */}
          <div className="group relative bg-white hover:bg-slate-50/60 border border-slate-200/90 hover:border-blue-400 rounded-3xl p-6 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                  <Database className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  Base de Datos
                </span>
              </div>

              <h3 className="text-lg font-bold text-[#16345F] mb-2 flex items-center gap-1.5">
                PostgreSQL
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
                Motor relacional ACID con arquitectura de particionamiento y aislamiento estricto multi-inquilino. Copias de seguridad automáticas y cifrado de datos en reposo y en tránsito.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">Multi-Tenant Isolation</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">Daily Backups</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">Ley 1581 Compliant</span>
            </div>
          </div>

          {/* Spring Boot / Java 21 */}
          <div className="group relative bg-white hover:bg-slate-50/60 border border-slate-200/90 hover:border-emerald-400 rounded-3xl p-6 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                  <Cpu className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  Backend Modular
                </span>
              </div>

              <h3 className="text-lg font-bold text-[#16345F] mb-2 flex items-center gap-1.5">
                Spring Boot (Java 21)
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
                Monolito modular empresarial con autenticación JWT, autorización granular RBAC por copropiedad, auditoría inmutable de transacciones y Web Push VAPID para notificaciones instantáneas.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">Java 21 LTS</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">Spring Security</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">Web Push VAPID</span>
            </div>
          </div>
        </div>

        {/* Security badge banner */}
        <div className="mt-12 p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#16345F]">Cumplimiento Estricto de Seguridad y Ley de Datos</h4>
              <p className="text-xs text-slate-500 mt-0.5">Tus datos están aislados por copropiedad y amparados bajo la Ley 1581 de 2012 (Habeas Data) en Colombia.</p>
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-700 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 shrink-0">
            TLS 1.3 • AES-256 En Cifrado • Backups Diarios
          </div>
        </div>
      </div>
    </section>
  );
};
