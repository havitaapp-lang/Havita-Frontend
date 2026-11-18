import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { DemoModal } from '../components/DemoModal';
import { FloatingWhatsApp } from '../components/FloatingWhatsApp';
import { CookieConsentBanner } from '../components/CookieConsentBanner';

export interface PublicLayoutContext {
  openDemo: (plan?: string) => void;
}

export const PublicLayout: React.FC = () => {
  const [demoOpen, setDemoOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);

  const handleOpenDemo = (planOrEvent?: unknown) => {
    // Si viene de un evento de click o no es un string válido, limpiamos el plan
    const plan = typeof planOrEvent === 'string' && planOrEvent.trim() ? planOrEvent.trim() : undefined;
    setSelectedPlan(plan);
    setDemoOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white text-slate-900 selection:bg-blue-100 selection:text-[#16345F]">
      <Navbar onOpenDemo={() => handleOpenDemo()} />
      
      <main className="flex-1">
        <Outlet context={{ openDemo: handleOpenDemo }} />
      </main>

      <Footer />

      {/* Floating direct WhatsApp contact */}
      <FloatingWhatsApp />

      {/* Banner de consentimiento de cookies y Habeas Data */}
      <CookieConsentBanner />

      {/* Demo Modal with optional preselected plan */}
      <DemoModal 
        isOpen={demoOpen} 
        onClose={() => setDemoOpen(false)}
        initialPlan={selectedPlan}
      />
    </div>
  );
};
