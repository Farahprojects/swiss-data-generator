
import React, { useState, useEffect } from 'react';
import { Star, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface HeroSectionProps {
  onGetReportClick?: () => void;
}

const HeroSection = ({ onGetReportClick }: HeroSectionProps) => {
  // Rotating words for the "Your..." animation - easily customizable
  const rotatingWords = ['self', 'mind', 'bae', 'soul', 'will'];
  
  // Banner images for smooth transitions - from explore more section
  const bannerImages = [
    '/lovable-uploads/410f6d32-9a00-4def-9f98-9b76bceff492.png', // Focus
    '/lovable-uploads/f2552227-155d-477d-9c93-ac4eb72b5ddf.png', // Flow
    '/lovable-uploads/71cede7b-0de9-4397-897f-29009a07c012.png', // Compatibility
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % bannerImages.length);
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, [bannerImages.length]);

  // Word rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 3000); // Change word every 3 seconds

    return () => clearInterval(interval);
  }, [rotatingWords.length]);

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
    <section className="relative h-screen flex items-center justify-center bg-white overflow-hidden">
      {/* Animated star constellations based on reference */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Constellation 1 - Left pattern (angular shape) */}
        <div className="absolute top-20 left-16 animate-pulse" style={{animationDelay: '0s', animationDuration: '4s'}}>
          <Star className="w-3 h-3 text-primary/60 absolute top-0 left-0" fill="currentColor" />
          <Star className="w-3 h-3 text-primary/60 absolute top-6 left-2" fill="currentColor" />
          <Star className="w-3 h-3 text-primary/60 absolute top-12 left-0" fill="currentColor" />
          <Star className="w-3 h-3 text-primary/60 absolute top-18 left-4" fill="currentColor" />
          {/* Connection lines */}
          <div className="absolute top-1.5 left-1.5 w-6 h-px bg-primary/30 rotate-[18deg]"></div>
          <div className="absolute top-7.5 left-3 w-6 h-px bg-primary/30 rotate-[-18deg]"></div>
          <div className="absolute top-13.5 left-1.5 w-8 h-px bg-primary/30 rotate-[26deg]"></div>
        </div>

        {/* Constellation 2 - Top center pattern (diamond-like) */}
        <div className="absolute top-16 right-24 animate-pulse" style={{animationDelay: '2s', animationDuration: '5s'}}>
          <Star className="w-3 h-3 text-primary/60 absolute top-0 left-6" fill="currentColor" />
          <Star className="w-3 h-3 text-primary/60 absolute top-4 left-2" fill="currentColor" />
          <Star className="w-3 h-3 text-primary/60 absolute top-4 left-10" fill="currentColor" />
          <Star className="w-3 h-3 text-primary/60 absolute top-8 left-0" fill="currentColor" />
          <Star className="w-3 h-3 text-primary/60 absolute top-8 left-12" fill="currentColor" />
          <Star className="w-3 h-3 text-primary/60 absolute top-12 left-6" fill="currentColor" />
          {/* Connection lines forming diamond pattern */}
          <div className="absolute top-1.5 left-7.5 w-6 h-px bg-primary/30 rotate-[-45deg]"></div>
          <div className="absolute top-1.5 left-7.5 w-6 h-px bg-primary/30 rotate-[45deg]"></div>
          <div className="absolute top-5.5 left-3.5 w-6 h-px bg-primary/30 rotate-[-45deg]"></div>
          <div className="absolute top-5.5 left-9.5 w-6 h-px bg-primary/30 rotate-[45deg]"></div>
          <div className="absolute top-9.5 left-1.5 w-6 h-px bg-primary/30 rotate-[45deg]"></div>
          <div className="absolute top-9.5 left-11.5 w-6 h-px bg-primary/30 rotate-[-45deg]"></div>
        </div>

        {/* Constellation 3 - Right pattern (chair-like shape) */}
        <div className="absolute top-1/2 right-12 -translate-y-1/2 animate-pulse" style={{animationDelay: '1s', animationDuration: '6s'}}>
          <Star className="w-3 h-3 text-primary/60 absolute top-0 left-0" fill="currentColor" />
          <Star className="w-3 h-3 text-primary/60 absolute top-0 left-8" fill="currentColor" />
          <Star className="w-3 h-3 text-primary/60 absolute top-6 left-8" fill="currentColor" />
          <Star className="w-3 h-3 text-primary/60 absolute top-12 left-0" fill="currentColor" />
          <Star className="w-3 h-3 text-primary/60 absolute top-12 left-8" fill="currentColor" />
          <Star className="w-3 h-3 text-primary/60 absolute top-18 left-4" fill="currentColor" />
          {/* Connection lines forming chair pattern */}
          <div className="absolute top-1.5 left-1.5 w-8 h-px bg-primary/30"></div>
          <div className="absolute top-7.5 left-9.5 w-px h-8 bg-primary/30"></div>
          <div className="absolute top-13.5 left-1.5 w-8 h-px bg-primary/30"></div>
          <div className="absolute top-13.5 left-5.5 w-6 h-px bg-primary/30 rotate-[-45deg]"></div>
          <div className="absolute top-13.5 left-9.5 w-6 h-px bg-primary/30 rotate-[45deg]"></div>
        </div>

        {/* Constellation 4 - Bottom left (simple triangle) */}
        <div className="absolute top-1/2 left-8 translate-y-8 animate-pulse" style={{animationDelay: '3s', animationDuration: '4.5s'}}>
          <Star className="w-3 h-3 text-primary/60 absolute top-0 left-4" fill="currentColor" />
          <Star className="w-3 h-3 text-primary/60 absolute top-8 left-0" fill="currentColor" />
          <Star className="w-3 h-3 text-primary/60 absolute top-8 left-8" fill="currentColor" />
          {/* Connection lines forming triangle */}
          <div className="absolute top-1.5 left-5.5 w-6 h-px bg-primary/30 rotate-[-45deg]"></div>
          <div className="absolute top-1.5 left-5.5 w-6 h-px bg-primary/30 rotate-[45deg]"></div>
          <div className="absolute top-9.5 left-1.5 w-8 h-px bg-primary/30"></div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <h1 className="text-5xl md:text-8xl lg:text-9xl font-light text-gray-900 leading-tight mb-8">
            Know
            <br />
            <span className="italic font-medium flex items-center justify-start md:justify-center whitespace-nowrap gap-x-2 ml-1">
              <span>Your</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentWordIndex}
                  initial={{ opacity: 0, rotateX: 90 }}
                  animate={{ opacity: 1, rotateX: 0 }}
                  exit={{ opacity: 0, rotateX: -90 }}
                  transition={{ duration: 0.3 }}
                  className="inline-block"
                >
                  {rotatingWords[currentWordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mb-16"
        >
          <p className="text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
            Psychological insights that create momentum
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="mb-20"
        >
          <Button 
            onClick={handleClick}
            className="bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-hover transition-colors duration-200 shadow-lg"
          >
            Unlock
          </Button>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="flex justify-center items-center gap-8 text-sm text-gray-500 font-medium"
        >
          <div className="flex items-center gap-2 group">
            <Star className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span>AI-Analyzed</span>
          </div>
          <div className="flex items-center gap-2 group">
            <Clock className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span>Instant</span>
          </div>
          <div className="flex items-center gap-2 group">
            <Shield className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span>Private</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
