
import React from 'react';
import { CheckCircle, Clock, Star } from 'lucide-react';

const WhyChooseSection = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Reports?</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">AI-Powered Accuracy</h3>
            <p className="text-muted-foreground">Advanced algorithms ensure precise calculations and personalized insights.</p>
          </div>
          <div className="text-center">
            <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Instant Delivery</h3>
            <p className="text-muted-foreground">Get your comprehensive report delivered to your email within minutes.</p>
          </div>
          <div className="text-center">
            <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Star className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Professional Quality</h3>
            <p className="text-muted-foreground">Detailed, professional-grade reports trusted by astrology enthusiasts.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseSection;
