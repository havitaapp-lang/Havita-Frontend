import React from 'react';
import { DashboardPreview } from './DashboardPreview';
import { PhoneMockup } from './PhoneMockup';
import { NotificationGroup } from './NotificationPreview';

export const ProductMockup: React.FC = () => {
  return (
    <div className="relative w-full max-w-[760px] mx-auto select-none pt-4 pb-8">
      
      {/* 1. LAPTOP CONTAINER */}
      <div className="relative w-full shadow-[0_30px_70px_-15px_rgba(22,52,95,0.18)] rounded-t-[1.75rem] border border-slate-300/80 bg-slate-200 p-2 sm:p-3 sm:pb-4 transition-transform duration-500">
        
        {/* Laptop Screen Bezel */}
        <div className="relative rounded-t-xl overflow-hidden bg-slate-900 border-[3px] border-slate-800 shadow-inner">
          
          {/* Webcam dot */}
          <div className="absolute top-1 inset-x-0 mx-auto w-1.5 h-1.5 rounded-full bg-slate-800 z-30 flex items-center justify-center">
            <div className="w-0.5 h-0.5 rounded-full bg-blue-900" />
          </div>

          {/* Actual Dashboard UI inside laptop */}
          <div className="h-[360px] sm:h-[420px] lg:h-[450px] w-full overflow-hidden">
            <DashboardPreview />
          </div>
        </div>

        {/* Laptop Hinge & Aluminum Base Lip */}
        <div className="relative -mx-2 -mb-2 sm:-mx-3 sm:-mb-4 h-3.5 sm:h-4.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 rounded-b-xl border-t border-slate-300 shadow-md flex items-center justify-center">
          <div className="w-20 sm:w-24 h-1 bg-slate-400 rounded-full" />
        </div>
      </div>

      {/* 2. OVERLAPPING SMARTPHONE MOCKUP (Front Left) */}
      <div className="absolute -left-3 sm:-left-6 md:-left-8 -bottom-4 sm:-bottom-6 z-20 transform hover:scale-[1.02] transition-transform duration-300">
        <PhoneMockup />
      </div>

      {/* 3. FLOATING NOTIFICATION PILLS (Right Side) */}
      <div className="absolute -right-2 sm:-right-6 md:-right-10 top-8 sm:top-14 z-20 hidden md:block">
        <NotificationGroup />
      </div>

    </div>
  );
};
