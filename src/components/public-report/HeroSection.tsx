
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
    <section className="relative h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 overflow-hidden">
      {/* Subtle background image */}
      <div className="absolute inset-0 opacity-[0.03]">
        <img 
          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=800&fit=crop&crop=face"
          alt=""
          className="w-full h-full object-cover blur-sm"
        />
      </div>
      
      <div className="container mx-auto px-4 text-center relative z-10">
        {/* Floating testimonial - top-left corner */}
        <motion.div 
          initial={{ opacity: 0, x: -50, y: 50 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
          className="hidden lg:block absolute left-4 xl:left-8 top-16 max-w-xs"
        >
          <div className="bg-white/92 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/50 relative">
            {/* Subtle avatar silhouette */}
            <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 opacity-40"></div>
            <p className="text-sm italic text-muted-foreground leading-relaxed pr-6">
              "It didn't just tell me things — it made me feel seen."
            </p>
            <p className="text-xs font-medium text-primary mt-2">— Jess M.</p>
          </div>
        </motion.div>

        {/* Floating testimonial - top-right corner */}
        <motion.div 
          initial={{ opacity: 0, x: 50, y: 50 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6, ease: "easeOut" }}
          className="hidden lg:block absolute right-4 xl:right-8 top-24 max-w-xs"
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/50 relative">
            {/* Subtle avatar silhouette */}
            <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 opacity-40"></div>
            <p className="text-sm italic text-muted-foreground leading-relaxed pr-6">
              "Like a mirror to my inner world. Logical, accurate, nothing fluffy."
            </p>
            <p className="text-xs font-medium text-primary mt-2">— Tanya S.</p>
          </div>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-4xl md:text-6xl font-bold mb-6"
        >
          <span className="text-primary block">See Beneath the Surface.</span>
          <span className="text-primary block">Meet the You Behind the Mask.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6"
        >
          Discover the hidden patterns shaping your drive, resistance, and rhythm — mapped at birth, decoded now.
        </motion.p>
        
        {/* Mobile testimonials - stacked above and below CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="lg:hidden mb-6"
        >
          <div className="bg-white/92 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-white/50 max-w-sm mx-auto relative">
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 opacity-40"></div>
            <p className="text-sm italic text-muted-foreground pr-4">
              "It made me feel seen" — Jess M.
            </p>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
          className="mb-6 lg:mb-16"
        >
          <Button 
            onClick={handleClick}
            size="lg"
            variant="outline"
            className="h-16 px-12 text-lg font-medium rounded-2xl border-2 border-primary bg-white text-primary hover:bg-primary/5 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 animate-pulse hover:animate-none hover:shadow-primary/20"
          >
            Get My Insight
          </Button>
        </motion.div>

        {/* Second mobile testimonial */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="lg:hidden mb-8"
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-white/50 max-w-sm mx-auto relative">
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 opacity-40"></div>
            <p className="text-sm italic text-muted-foreground pr-4">
              "Logical, accurate, nothing fluffy" — Tanya S.
            </p>
          </div>
        </motion.div>
        
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
      </div>
    </section>
  );
};

export default HeroSection;
