import React from 'react';
import { SidebarPreview } from './SidebarPreview';
import { StatsPreview } from './StatsPreview';
import { ActivityPreview } from './ActivityPreview';
import { PQRSChartPreview, VisitorsChartPreview, PackagesChartPreview } from './ChartPreview';
import { Building2, Bell, ChevronDown } from 'lucide-react';
import { defaultDemoTenant } from '../../config/tenant';

export const DashboardPreview: React.FC = () => {
  return (
    <div className="w-full h-full bg-[#f8fafc] rounded-lg overflow-hidden flex flex-col font-sans select-none text-left">
      {/* Top Header Bar of the Mockup Dashboard */}
      <div className="h-10 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between shrink-0">
        {/* Left: Tenant Selector Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-800">
            <Building2 className="w-3 h-3 text-[var(--tenant-primary)]" />
            <span>{defaultDemoTenant.name}</span>
            <ChevronDown className="w-2.5 h-2.5 text-slate-400 ml-0.5" />
          </div>
        </div>

        {/* Right: Search / Actions / Avatar */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Bell className="w-3.5 h-3.5 text-slate-500" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-1 ring-white" />
          </div>
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold shadow-sm">
            A
          </div>
        </div>
      </div>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Dark Navy Sidebar */}
        <SidebarPreview />

        {/* Main Content Dashboard Area */}
        <div className="flex-1 p-3 lg:p-4 overflow-hidden flex flex-col gap-3 bg-[#f8fafc]">
          
          {/* Row 1: KPI Stats */}
          <StatsPreview />

          {/* Row 2: PQRS Chart (60%) + Atención requerida (40%) */}
          <div className="grid grid-cols-12 gap-2.5 flex-1 min-h-0">
            <div className="col-span-7">
              <PQRSChartPreview />
            </div>
            <div className="col-span-5">
              <ActivityPreview />
            </div>
          </div>

          {/* Row 3: Visitantes Chart (55%) + Paquetes Chart (45%) */}
          <div className="grid grid-cols-12 gap-2.5 flex-1 min-h-0">
            <div className="col-span-6">
              <VisitorsChartPreview />
            </div>
            <div className="col-span-6">
              <PackagesChartPreview />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
