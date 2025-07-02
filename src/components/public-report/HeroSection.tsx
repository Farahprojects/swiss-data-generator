
import React from 'react';
import { Star, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface HeroSectionProps {
  onGetReportClick?: () => void;
}

const HeroSection = ({ onGetReportClick }: HeroSectionProps) => {
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
    <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-white overflow-hidden">
      {/* Animated Background Images */}
      <motion.div
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ duration: 3, ease: "easeOut" }}
        className="absolute top-10 left-10 w-32 h-32 rounded-full overflow-hidden shadow-2xl"
      >
        <img 
          src="/lovable-uploads/410f6d32-9a00-4def-9f98-9b76bceff492.png" 
          alt="Focus" 
          className="w-full h-full object-cover"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ duration: 3, delay: 0.5, ease: "easeOut" }}
        className="absolute top-20 right-16 w-40 h-40 rounded-full overflow-hidden shadow-2xl"
      >
        <img 
          src="/lovable-uploads/c245dba6-7af4-444f-a486-44594e57c9fd.png" 
          alt="Flow" 
          className="w-full h-full object-cover"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 0.12, scale: 1 }}
        transition={{ duration: 3, delay: 1, ease: "easeOut" }}
        className="absolute bottom-32 left-20 w-28 h-28 rounded-full overflow-hidden shadow-2xl"
      >
        <img 
          src="/lovable-uploads/410f6d32-9a00-4def-9f98-9b76bceff492.png" 
          alt="Focus" 
          className="w-full h-full object-cover"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 0.12, scale: 1 }}
        transition={{ duration: 3, delay: 1.5, ease: "easeOut" }}
        className="absolute bottom-40 right-10 w-36 h-36 rounded-full overflow-hidden shadow-2xl"
      >
        <img 
          src="/lovable-uploads/c245dba6-7af4-444f-a486-44594e57c9fd.png" 
          alt="Flow" 
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Floating Animation for Background Images */}
      <motion.div
        animate={{ 
          y: [0, -15, 0],
          rotate: [0, 2, 0]
        }}
        transition={{ 
          duration: 6, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute top-10 left-10 w-32 h-32 rounded-full overflow-hidden shadow-2xl opacity-15"
      >
        <img 
          src="/lovable-uploads/410f6d32-9a00-4def-9f98-9b76bceff492.png" 
          alt="Focus" 
          className="w-full h-full object-cover"
        />
      </motion.div>

      <motion.div
        animate={{ 
          y: [0, 20, 0],
          rotate: [0, -3, 0]
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity, 
          ease: "easeInOut",
          delay: 1
        }}
        className="absolute top-20 right-16 w-40 h-40 rounded-full overflow-hidden shadow-2xl opacity-15"
      >
        <img 
          src="/lovable-uploads/c245dba6-7af4-444f-a486-44594e57c9fd.png" 
          alt="Flow" 
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.h1 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-4xl md:text-6xl font-bold mb-6"
        >
          <span className="text-primary block">Your Subconscious, Unlocked</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12"
        >
          Reveal the subconscious patterns shaping your life — your drive, your resistance, your rhythm. Mapped at birth. Reflected back now.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="mb-16"
        >
          <Button 
            onClick={handleClick}
            size="lg"
            variant="outline"
            className="h-16 px-12 text-lg font-medium rounded-2xl border-2 border-primary bg-white text-primary hover:bg-primary/5 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            Begin
          </Button>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="flex justify-center items-center gap-8 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Instant Delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Secure Payment</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <span>Professional Quality</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
