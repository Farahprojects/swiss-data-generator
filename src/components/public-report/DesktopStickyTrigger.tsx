
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

const DesktopStickyTrigger = () => {
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const shouldShow = scrollY > 600; // Show after scrolling past hero section
      setIsVisible(shouldShow);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isMobile) return null;

  const handleClick = () => {
    // Scroll to the report form or trigger the same action as hero button
    const reportSection = document.querySelector('#report-form');
    if (reportSection) {
      reportSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.8 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30 
          }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
        >
          <Button
            onClick={handleClick}
            size="lg"
            variant="outline"
            className="h-16 px-12 text-lg font-medium rounded-2xl border-2 border-primary bg-white text-primary hover:bg-primary/5 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            Get Your Report
            <ArrowRight className="ml-3 h-5 w-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DesktopStickyTrigger;
