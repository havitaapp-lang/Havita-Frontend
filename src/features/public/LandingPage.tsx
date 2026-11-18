import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Hero } from '../../sections/Hero';
import { TrustBar } from '../../components/TrustBar';
import { DualPlatformShowcase } from '../../sections/DualPlatformShowcase';
import { ProblemsSolved } from '../../sections/ProblemsSolved';
import { Modules } from '../../sections/Modules';
import { HowItWorks } from '../../sections/HowItWorks';
import { Pricing } from '../../sections/Pricing';
import { SocialProof } from '../../sections/SocialProof';
import { TechStackTrust } from '../../components/TechStackTrust';
import { FAQ } from '../../sections/FAQ';
import { FinalCTA } from '../../sections/FinalCTA';
import type { PublicLayoutContext } from '../../layouts/PublicLayout';

export const LandingPage: React.FC = () => {
  const context = useOutletContext<PublicLayoutContext>();
  const openDemo = context?.openDemo || (() => {});

  const handleScrollToHowItWorks = () => {
    const elem = document.getElementById('how-it-works');
    if (elem) {
      const yOffset = -80;
      const y = elem.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col bg-white">
      {/* 1. Hero Section */}
      <Hero 
        onOpenDemo={openDemo} 
        onScrollToHowItWorks={handleScrollToHowItWorks} 
      />

      {/* 2. Institutional & Regulatory Trust Bar */}
      <TrustBar />

      {/* 3. The Two Faces of Havita: Web Admin Panel vs Mobile PWA */}
      <DualPlatformShowcase onOpenDemo={openDemo} />

      {/* 4. Real Problems Solved in Colombian Condominiums */}
      <ProblemsSolved onOpenDemo={openDemo} />

      {/* 5. Modules Ecosystem Segmented by Role Tabs */}
      <Modules onOpenDemo={openDemo} />

      {/* 6. Onboarding in 3 Steps with Free Excel Migration */}
      <HowItWorks onOpenDemo={openDemo} />

      {/* 7. Transparent Pricing Calculator ($3.000 COP/unit) */}
      <Pricing onOpenDemo={openDemo} />

      {/* 8. Pioneer Program (Early Adopter Pilot Offer) */}
      <SocialProof onOpenDemo={openDemo} />

      {/* 9. Enterprise Tech Stack (Cloudflare, Railway, Postgres) */}
      <TechStackTrust />

      {/* 10. Frequently Asked Questions */}
      <FAQ />

      {/* 11. Final Conversion CTA Card */}
      <FinalCTA onOpenDemo={openDemo} />
    </div>
  );
};

export default LandingPage;
