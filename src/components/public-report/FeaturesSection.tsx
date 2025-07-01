
import React from 'react';
import { Sparkles, Heart, Brain } from 'lucide-react';

const FeaturesSection = () => {
  return (
    <section className="h-screen flex items-center justify-center bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Discover Your Cosmic Blueprint</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Personalized Insights</h3>
            <p className="text-muted-foreground">Get detailed analysis tailored specifically to your unique birth chart and cosmic fingerprint.</p>
          </div>
          <div className="text-center">
            <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Relationship Compatibility</h3>
            <p className="text-muted-foreground">Understand your connections with others through comprehensive compatibility analysis.</p>
          </div>
          <div className="text-center">
            <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Life Guidance</h3>
            <p className="text-muted-foreground">Receive actionable guidance for personal growth and life decisions based on astrological wisdom.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
