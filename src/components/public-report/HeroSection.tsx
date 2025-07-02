
import React from 'react';
import { Star, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
        {/* Floating testimonial - left side */}
        <div className="hidden lg:block absolute left-8 top-1/2 transform -translate-y-1/2 max-w-xs">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/50">
            <p className="text-sm italic text-muted-foreground leading-relaxed">
              "It didn't just tell me things — it made me feel seen."
            </p>
            <p className="text-xs font-medium text-primary mt-2">— Jess M.</p>
          </div>
        </div>

        {/* Floating testimonial - right side */}
        <div className="hidden lg:block absolute right-8 top-1/2 transform -translate-y-1/2 translate-y-12 max-w-xs">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/50">
            <p className="text-sm italic text-muted-foreground leading-relaxed">
              "Like a mirror to my inner world. Logical, accurate, nothing fluffy."
            </p>
            <p className="text-xs font-medium text-primary mt-2">— Tanya S.</p>
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          <span className="text-primary block">See Beneath the Surface of your Mind</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
          Discover the hidden patterns shaping your drive, resistance, and rhythm — mapped at birth, decoded now.
        </p>
        
        {/* Subtle testimonial under subheading - mobile/tablet */}
        <div className="lg:hidden mb-8">
          <p className="text-sm italic text-muted-foreground/80 max-w-md mx-auto">
            "It made me feel seen" — Jess M.
          </p>
        </div>
        
        <div className="mb-16">
          <Button 
            onClick={handleClick}
            size="lg"
            variant="outline"
            className="h-16 px-12 text-lg font-medium rounded-2xl border-2 border-primary bg-white text-primary hover:bg-primary/5 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            Get My Insight
          </Button>
        </div>
        
        <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground">
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
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
