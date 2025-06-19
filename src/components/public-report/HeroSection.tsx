
import React from 'react';
import { Star, Clock, Shield } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20" style={{ scrollSnapAlign: 'start' }}>
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          The Mirror in your eyes
          <span className="text-primary block mt-2">Your Subconscious, Unlocked</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Reveal the subconscious patterns shaping your life — your drive, your resistance, your rhythm. Mapped at birth. Reflected back now.
        </p>
        
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
