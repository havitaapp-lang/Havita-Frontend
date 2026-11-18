import React from 'react';
import { ShieldCheck, Lock, Cloud, Headphones } from 'lucide-react';

export const TrustBar: React.FC = () => {
  const trustItems = [
    {
      icon: ShieldCheck,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      title: 'Alineado a Ley 675 / 2001',
      desc: 'Quórum y votaciones ponderadas por coeficientes'
    },
    {
      icon: Lock,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      title: 'Habeas Data Ley 1581',
      desc: 'Privacidad y protección de datos garantizada'
    },
    {
      icon: Cloud,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      title: 'Borde Seguro Cloudflare',
      desc: 'WebRTC de ultra baja latencia y 99.9% uptime'
    },
    {
      icon: Headphones,
      iconColor: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      title: 'Soporte Local en Colombia',
      desc: 'Acompañamiento y migración desde Excel sin costo'
    }
  ];

  return (
    <div className="w-full bg-white border-y border-slate-200/70 py-6 sm:py-8 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 items-center">
          {trustItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-center gap-3.5">
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl ${item.bgColor} ${item.iconColor} flex items-center justify-center shrink-0 shadow-xs border border-slate-100`}>
                  <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-[#16345F] leading-tight truncate">
                    {item.title}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-[#667085] leading-normal line-clamp-1 mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
