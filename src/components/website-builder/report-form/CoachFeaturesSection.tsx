
import React from 'react';
import { CheckCircle, Clock, Star, Heart } from 'lucide-react';

interface CoachFeaturesSectionProps {
  coachName: string;
  customizationData: any;
}

const CoachFeaturesSection: React.FC<CoachFeaturesSectionProps> = ({ coachName, customizationData }) => {
  const themeColor = customizationData?.themeColor || '#6366F1';
  const fontFamily = customizationData?.fontFamily || 'Inter';

  return (
    <section 
      className="h-screen flex items-center justify-center bg-muted/30"
      style={{ fontFamily: `${fontFamily}, sans-serif` }}
    >
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          Why Choose {coachName}'s Reports?
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div 
              className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <CheckCircle className="h-8 w-8" style={{ color: themeColor }} />
            </div>
            <h3 className="font-semibold mb-2">Expert Analysis</h3>
            <p className="text-muted-foreground">
              {coachName}'s professional expertise ensures accurate insights and personalized guidance.
            </p>
          </div>
          <div className="text-center">
            <div 
              className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <Clock className="h-8 w-8" style={{ color: themeColor }} />
            </div>
            <h3 className="font-semibold mb-2">Instant Delivery</h3>
            <p className="text-muted-foreground">
              Get your comprehensive report delivered to your email within minutes of completion.
            </p>
          </div>
          <div className="text-center">
            <div 
              className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <Heart className="h-8 w-8" style={{ color: themeColor }} />
            </div>
            <h3 className="font-semibold mb-2">Personalized Touch</h3>
            <p className="text-muted-foreground">
              Each report is crafted with {coachName}'s unique approach and deep understanding.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CoachFeaturesSection;
