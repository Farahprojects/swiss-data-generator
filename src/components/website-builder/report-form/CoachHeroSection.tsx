
import React from 'react';
import { Star, Clock, Shield } from 'lucide-react';

interface CoachHeroSectionProps {
  coachName: string;
  customizationData: any;
}

const CoachHeroSection: React.FC<CoachHeroSectionProps> = ({ coachName, customizationData }) => {
  const themeColor = customizationData?.themeColor || '#6366F1';
  const fontFamily = customizationData?.fontFamily || 'Inter';

  return (
    <section 
      className="h-screen flex items-center justify-center relative overflow-hidden"
      style={{ fontFamily: `${fontFamily}, sans-serif` }}
    >
      {/* Gradient Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${themeColor}15 0%, ${themeColor}05 50%, transparent 100%)`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/20" />
      
      <div className="container mx-auto px-4 text-center relative z-10">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Discover Your Inner Blueprint
          <span className="block mt-2" style={{ color: themeColor }}>
            with {coachName}
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Reveal the subconscious patterns shaping your life — your drive, your resistance, your rhythm. 
          Mapped at birth. Reflected back now through {coachName}'s expert guidance.
        </p>
        
        <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" style={{ color: themeColor }} />
            <span>Instant Delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" style={{ color: themeColor }} />
            <span>Secure Payment</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" style={{ color: themeColor }} />
            <span>Professional Quality</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CoachHeroSection;
