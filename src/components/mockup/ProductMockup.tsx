import React from 'react';
import { DashboardPreview } from './DashboardPreview';
import { PhoneMockup } from './PhoneMockup';
import { NotificationGroup } from './NotificationPreview';
import { ShieldCheck, Sparkles, Smartphone, CheckCircle2 } from 'lucide-react';

export const ProductMockup: React.FC = () => {
  return (
    <div className="relative w-full max-w-[760px] mx-auto select-none pt-2 pb-6 sm:pb-8">
      
      {/* --- DESKTOP VIEW (md and up): Full Laptop + Overlapping Phone + Floating Notifications --- */}
      <div className="hidden md:block relative w-full">
        {/* 1. Laptop Container */}
        <div className="relative w-full shadow-[0_30px_70px_-15px_rgba(22,52,95,0.18)] rounded-t-[1.75rem] border border-slate-300/80 bg-slate-200 p-3 pb-4 transition-transform duration-500">
          
          {/* Laptop Screen Bezel */}
          <div className="relative rounded-t-xl overflow-hidden bg-slate-900 border-[3px] border-slate-800 shadow-inner">
            
            {/* Webcam dot */}
            <div className="absolute top-1 inset-x-0 mx-auto w-1.5 h-1.5 rounded-full bg-slate-800 z-30 flex items-center justify-center">
              <div className="w-0.5 h-0.5 rounded-full bg-blue-900" />
            </div>

            {/* Actual Dashboard UI inside laptop */}
            <div className="h-[400px] lg:h-[450px] w-full overflow-hidden">
              <DashboardPreview />
            </div>
          </div>

          {/* Laptop Hinge & Base Lip */}
          <div className="relative -mx-3 -mb-4 h-4.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 rounded-b-xl border-t border-slate-300 shadow-md flex items-center justify-center">
            <div className="w-24 h-1 bg-slate-400 rounded-full" />
          </div>
        </div>

        {/* 2. Overlapping Smartphone Mockup (Front Left) */}
        <div className="absolute -left-6 lg:-left-8 -bottom-6 z-20 transform hover:scale-[1.02] transition-transform duration-300">
          <PhoneMockup />
        </div>

        {/* 3. Floating Notification Pills (Right Side) */}
        <div className="absolute -right-4 lg:-right-10 top-12 z-20">
          <NotificationGroup />
        </div>
      </div>

      {/* --- MOBILE VIEW (under md): Centered High-Fidelity Phone Showcase with Floating Tags --- */}
      <div className="block md:hidden relative flex flex-col items-center justify-center pt-2">
        
        {/* Mobile App Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold mb-3 shadow-xs">
          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
          <span>App PWA para Residentes y Portería</span>
        </div>

        {/* Phone Container with Subtle Shadow */}
        <div className="relative z-10 transform scale-[0.94] sm:scale-100 transition-transform">
          <PhoneMockup />

          {/* Floating Mobile Feature Tags */}
          <div className="absolute -left-3 top-28 bg-white/95 backdrop-blur-md border border-slate-200/80 text-[#16345F] px-2.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 z-30 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold">Citófono sonando</span>
          </div>

          <div className="absolute -right-3 bottom-24 bg-white/95 backdrop-blur-md border border-slate-200/80 text-[#16345F] px-2.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 z-30">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-bold">Visita autorizada QR</span>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-2 font-medium">
          Acceso instantáneo desde celular sin ocupar espacio de almacenamiento.
        </p>
      </div>

    </div>
  );
};
