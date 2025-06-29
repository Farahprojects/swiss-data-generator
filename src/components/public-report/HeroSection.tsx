
import React from 'react';
import { Star, Clock, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  return (
    <section className="h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          <span className="text-primary block">Your Subconscious, Unlocked</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
          Reveal the subconscious patterns shaping your life — your drive, your resistance, your rhythm. Mapped at birth. Reflected back now.
        </p>
        
        <div className="mb-16">
          <Button 
            size="lg"
            className="h-16 px-12 text-lg font-medium rounded-2xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-primary/20"
          >
            Get Your Report
            <ArrowRight className="ml-3 h-5 w-5" />
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
