
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileReportDrawer from './MobileReportDrawer';

const MobileReportTrigger = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const shouldShow = scrollY > 100; // Show after scrolling 100px
      setIsVisible(shouldShow);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isMobile) return null;

  return (
    <>
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
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
          >
            <Button
              onClick={() => setIsDrawerOpen(true)}
              size="lg"
              variant="outline"
              className="h-14 px-8 rounded-full border-2 border-primary bg-white text-primary hover:bg-primary/5 shadow-lg font-semibold text-lg"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Get Your Report
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileReportDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
    </>
  );
};

export default MobileReportTrigger;
