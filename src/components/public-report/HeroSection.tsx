
import React, { useState, useEffect } from 'react';
import { Star, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface HeroSectionProps {
  onGetReportClick?: () => void;
}

const HeroSection = ({ onGetReportClick }: HeroSectionProps) => {
  // Rotating words for the "Your..." animation - easily customizable
  const rotatingWords = ['Self', 'Mind', 'Bae', 'Soul', 'Will'];
  
  // Banner images for smooth transitions - from explore more section
  const bannerImages = [
    '/placeholder.svg', // Focus
    '/placeholder.svg', // Flow
    '/placeholder.svg', // Compatibility
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
      <div className="relative z-10 w-full px-4 container mx-auto text-center max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <h1 className="text-5xl xs:text-6xl sm:text-7xl lg:text-9xl xl:text-[10rem] font-light text-gray-900 leading-tight mb-8">
            Know
            <br />
            <span className="italic font-medium flex items-center justify-center gap-x-7 flex-wrap">
              <span>Your</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentWordIndex}
                  initial={{ opacity: 0, rotateX: 90 }}
                  animate={{ opacity: 1, rotateX: 0 }}
                  exit={{ opacity: 0, rotateX: -90 }}
                  transition={{ duration: 0.3 }}
                  className="inline-block min-w-[3rem] sm:min-w-[4rem] md:min-w-[8rem] lg:min-w-[10rem] text-left"
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
          <p className="text-lg sm:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
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
            className="bg-gray-900 text-white px-8 py-4 rounded-xl text-lg font-normal hover:bg-gray-800 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
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
            <span>Analyse</span>
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
