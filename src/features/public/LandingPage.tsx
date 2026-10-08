import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Hero } from '../../sections/Hero';
import { Modules } from '../../sections/Modules';
import { HowItWorks } from '../../sections/HowItWorks';
import { SocialProof } from '../../sections/SocialProof';
import { Pricing } from '../../sections/Pricing';
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
      {/* 1. Hero Section (with realistic Laptop, Phone & Floating Notifications) */}
      <Hero 
        onOpenDemo={openDemo} 
        onScrollToHowItWorks={handleScrollToHowItWorks} 
      />

      {/* 2. Modules Section (8 cards in 4 cols matching reference) */}
      <div id="features">
        <Modules onOpenDemo={openDemo} />
      </div>

      {/* 3. How It Works Section (3 steps with arrows) */}
      <HowItWorks onOpenDemo={openDemo} />

      {/* 4. Social Proof / Community Trust & Testimonial */}
      <SocialProof />

      {/* 5. Transparent Pricing Section */}
      <Pricing onOpenDemo={openDemo} />

      {/* 6. Frequently Asked Questions */}
      <FAQ />

      {/* 7. Final Dark Navy Banner CTA */}
      <FinalCTA onOpenDemo={openDemo} />
    </div>
  );
};

export default LandingPage;
