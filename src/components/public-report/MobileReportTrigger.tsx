
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
interface MobileReportTriggerProps {
  isDrawerOpen: boolean;
  onOpenDrawer: () => void;
}

const MobileReportTrigger = ({ isDrawerOpen, onOpenDrawer }: MobileReportTriggerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Safe mobile detection on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleScroll = () => {
        const scrollY = window.scrollY;
        const shouldShow = scrollY > 100; // Show after scrolling 100px
        setIsVisible(shouldShow);
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  if (!isMobile) return null;

  return (
    <AnimatePresence>
      {isVisible && !isDrawerOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.8 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30 
          }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 max-w-[calc(100vw-2rem)] pb-safe"
        >
          <Button
            onClick={onOpenDrawer}
            size="lg"
            variant="outline"
            className="h-14 px-8 rounded-full border-2 border-primary/80 backdrop-blur-sm bg-white/95 text-primary hover:bg-primary/5 hover:border-primary shadow-xl font-semibold text-lg whitespace-nowrap min-w-fit"
          >
            Unlock
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileReportTrigger;
