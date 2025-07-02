
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
    <section className="relative h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-background overflow-hidden flex flex-col justify-center items-center text-center px-4">
      {/* Subtle animated background pattern */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.08 }}
        transition={{ duration: 2 }}
        className="absolute inset-0 bg-[radial-gradient(hsl(var(--primary))_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"
      />

      {/* Gentle shifting glow */}
      <motion.div
        animate={{ 
          background: [
            "radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.05) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 50%, hsl(var(--primary) / 0.05) 0%, transparent 50%)",
            "radial-gradient(circle at 50% 20%, hsl(var(--primary) / 0.05) 0%, transparent 50%)",
            "radial-gradient(circle at 50% 80%, hsl(var(--primary) / 0.05) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.05) 0%, transparent 50%)"
          ]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-4xl md:text-6xl font-bold text-primary mb-6"
      >
        See Beneath the Surface of Your Mind
      </motion.h1>

      {/* Subheading */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="mt-4 max-w-2xl text-muted-foreground text-lg md:text-xl mb-8"
      >
        Discover hidden patterns shaping your drive, resistance, and rhythm — mapped at birth, decoded now.
      </motion.p>

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="mb-16"
      >
        <Button 
          onClick={handleClick}
          size="lg"
          variant="outline"
          className="h-16 px-12 text-lg font-medium rounded-2xl border-2 border-primary bg-background text-primary hover:bg-primary/5 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 animate-pulse hover:animate-none hover:shadow-primary/20"
        >
          Get My Insight
        </Button>
      </motion.div>
      
      {/* Trust indicators */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
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
    </section>
  );
};

export default HeroSection;
