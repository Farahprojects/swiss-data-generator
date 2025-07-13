
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
interface DesktopStickyTriggerProps {
  onGetReportClick?: () => void;
}

const DesktopStickyTrigger = ({ onGetReportClick }: DesktopStickyTriggerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleScroll = () => {
        const scrollY = window.scrollY;
        const shouldShow = scrollY > 600; // Show after scrolling past hero section
        setIsVisible(shouldShow);
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  if (isMobile) return null;

  const handleClick = () => {
    if (onGetReportClick) {
      onGetReportClick();
    } else if (typeof window !== 'undefined') {
      // Fallback: scroll to Step 1
      const step1 = document.querySelector('[data-step="1"]');
      if (step1) {
        step1.scrollIntoView({ behavior: 'smooth' });
      }
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
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100] px-8 max-w-[calc(100vw-2rem)]"
        >
          <Button
            onClick={handleClick}
            size="lg"
            variant="outline"
            className="h-16 px-12 text-lg font-medium rounded-2xl border-2 border-primary/80 backdrop-blur-sm bg-white/95 text-primary hover:bg-primary/5 hover:border-primary shadow-xl hover:shadow-xl transform hover:scale-105 transition-all duration-300 whitespace-nowrap min-w-fit"
          >
            Unlock
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DesktopStickyTrigger;
