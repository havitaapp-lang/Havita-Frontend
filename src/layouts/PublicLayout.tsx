import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { DemoModal } from '../components/DemoModal';

export interface PublicLayoutContext {
  openDemo: () => void;
}

export const PublicLayout: React.FC = () => {
  const [demoOpen, setDemoOpen] = useState(false);

  const handleOpenDemo = () => {
    setDemoOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white text-slate-900 selection:bg-blue-100 selection:text-[#16345F]">
      <Navbar onOpenDemo={handleOpenDemo} />
      
      <main className="flex-1">
        <Outlet context={{ openDemo: handleOpenDemo }} />
      </main>

      <Footer />

      <DemoModal 
        isOpen={demoOpen} 
        onClose={() => setDemoOpen(false)} 
      />
    </div>
  );
};
