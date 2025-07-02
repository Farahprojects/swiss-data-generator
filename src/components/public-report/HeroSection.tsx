
import React, { useState, useEffect } from 'react';
import { Star, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface HeroSectionProps {
  onGetReportClick?: () => void;
}

const HeroSection = ({ onGetReportClick }: HeroSectionProps) => {
  // Banner images for smooth transitions - from explore more section
  const bannerImages = [
    '/lovable-uploads/410f6d32-9a00-4def-9f98-9b76bceff492.png', // Focus
    '/lovable-uploads/c245dba6-7af4-444f-a486-44594e57c9fd.png', // Flow
    '/lovable-uploads/71cede7b-0de9-4397-897f-29009a07c012.png', // Compatibility
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % bannerImages.length);
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, [bannerImages.length]);

  const handleClick = () => {
    if (onGetReportClick) {
      onGetReportClick();
    } else if (typeof window !== 'undefined') {
      // Fallback: scroll to Step 1 if no click handler provided
      const step1 = document.querySelector('[data-step="1"]');
      if (step1) {
        step1.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section className="relative h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 overflow-hidden">
      {/* Animated Banner Images */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.6, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${bannerImages[currentImageIndex]})`,
            }}
          />
        </AnimatePresence>
        {/* Subtle gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/10 to-background/30" />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          <span className="text-primary block">Your Subconscious, Unlocked</span>
        </h1>
        <p className="text-xl text-foreground max-w-2xl mx-auto mb-12 font-medium" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)' }}>
          Reveal the subconscious patterns shaping your life — your drive, your resistance, your rhythm. Mapped at birth. Reflected back now.
        </p>
        
        <div className="mb-16">
          <Button 
            onClick={handleClick}
            size="lg"
            variant="outline"
            className="h-16 px-12 text-lg font-medium rounded-2xl border-2 border-primary bg-white text-primary hover:bg-primary/5 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            Begin
          </Button>
        </div>
        
        <div className="flex justify-center items-center gap-8 text-sm text-foreground font-medium mb-8">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" style={{ filter: 'drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.3))' }} />
            <span style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)' }}>AI-Analyzed Psychology</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" style={{ filter: 'drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.3))' }} />
            <span style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)' }}>Instant Delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" style={{ filter: 'drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.3))' }} />
            <span style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)' }}>Fast, Focused Results</span>
          </div>
        </div>

        {/* Quote at the bottom */}
        <div className="text-center">
          <p className="text-lg italic text-foreground/80 font-medium" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)' }}>
            "Who looks outside, dreams; who looks inside, awakes"
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
