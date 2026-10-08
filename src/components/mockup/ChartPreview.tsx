import React from 'react';

export const PQRSChartPreview: React.FC = () => {
  return (
    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold text-slate-900 tracking-tight">PQRS</span>
        <span className="text-[9px] font-medium text-slate-400">Últimos 30 días</span>
      </div>

      <div className="relative h-20 w-full pt-1">
        <svg viewBox="0 0 200 70" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="pqrsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--tenant-primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--tenant-primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Subtle grid lines */}
          <line x1="0" y1="15" x2="200" y2="15" stroke="#f1f5f9" strokeDasharray="2 2" />
          <line x1="0" y1="38" x2="200" y2="38" stroke="#f1f5f9" strokeDasharray="2 2" />
          <line x1="0" y1="62" x2="200" y2="62" stroke="#f1f5f9" strokeDasharray="2 2" />
          
          {/* Area under curve */}
          <path 
            d="M0,50 Q30,60 60,35 T120,40 T170,18 T200,22 L200,68 L0,68 Z" 
            fill="url(#pqrsGradient)" 
          />
          {/* Stroke curve line */}
          <path 
            d="M0,50 Q30,60 60,35 T120,40 T170,18 T200,22" 
            fill="none" 
            stroke="var(--tenant-primary)" 
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Accent points */}
          <circle cx="60" cy="35" r="2.5" fill="var(--tenant-primary)" className="animate-ping opacity-30" />
          <circle cx="60" cy="35" r="2.5" fill="var(--tenant-primary)" stroke="#FFFFFF" strokeWidth="1" />
          <circle cx="170" cy="18" r="3" fill="#18B89A" stroke="#FFFFFF" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="flex justify-between text-[8px] text-slate-400 pt-1 font-medium">
        <span>Sem 1</span>
        <span>Sem 2</span>
        <span>Sem 3</span>
        <span>Sem 4</span>
      </div>
    </div>
  );
};

export const VisitorsChartPreview: React.FC = () => {
  const bars = [
    { day: 'Lun', height: 42, color: 'bg-blue-300' },
    { day: 'Mar', height: 58, color: 'bg-blue-400' },
    { day: 'Mié', height: 35, color: 'bg-blue-300' },
    { day: 'Jue', height: 70, color: 'bg-blue-500' },
    { day: 'Vie', height: 88, color: 'bg-blue-600' },
    { day: 'Sáb', height: 95, color: 'bg-teal-500' },
    { day: 'Dom', height: 64, color: 'bg-blue-400' },
  ];

  return (
    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold text-slate-900 tracking-tight">Visitantes</span>
        <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">
          +18% sem
        </span>
      </div>

      <div className="flex items-end justify-between gap-1.5 h-16 pt-2 px-1">
        {bars.map((bar) => (
          <div key={bar.day} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className={`w-full max-w-[12px] rounded-t-sm transition-all ${bar.color}`}
              style={{ height: `${bar.height}%` }}
            />
            <span className="text-[7.5px] text-slate-400 font-medium">{bar.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PackagesChartPreview: React.FC = () => {
  return (
    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-slate-900 tracking-tight">Paquetes</span>
        <span className="text-[9px] font-medium text-slate-400">Total: 23 hoy</span>
      </div>

      <div className="flex items-center justify-center gap-3 py-1">
        {/* SVG Donut */}
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            {/* Background ring */}
            <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="4" />
            {/* Segment 1: Entregados (65%) */}
            <circle 
              cx="18" cy="18" r="14" fill="none" stroke="var(--tenant-primary)" strokeWidth="4"
              strokeDasharray="57 100" strokeDashoffset="0"
            />
            {/* Segment 2: En tránsito (25%) */}
            <circle 
              cx="18" cy="18" r="14" fill="none" stroke="#14B8A6" strokeWidth="4"
              strokeDasharray="22 100" strokeDashoffset="-57"
            />
            {/* Segment 3: Pendientes (10%) */}
            <circle 
              cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="4"
              strokeDasharray="9 100" strokeDashoffset="-79"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-800">
            85%
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-1 text-[8.5px]">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--tenant-primary)]" />
            <span>Entregados (15)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />
            <span>En tránsito (5)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
            <span>Pendientes (3)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
