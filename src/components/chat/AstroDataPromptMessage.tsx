import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AstroDataPromptMessageProps {
  onAddAstroData: () => void;
  onContinueWithout: () => void;
}

export const AstroDataPromptMessage: React.FC<AstroDataPromptMessageProps> = ({
  onAddAstroData,
  onContinueWithout,
}) => {
  return (
    <div className="flex items-start justify-start mb-8">
      {/* Message Content */}
      <div className="px-4 py-3 rounded-2xl max-w-2xl lg:max-w-4xl text-black">
        <p className="text-base font-light leading-relaxed text-left mb-4">
          Would you like to add your astrological data for a more personalized experience? This will help me provide insights tailored to your unique chart.
        </p>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={onAddAstroData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors rounded-lg"
          >
            <Sparkles className="w-4 h-4" />
            Add Astro Data
          </Button>
          
          <Button
            onClick={onContinueWithout}
            variant="outline"
            className="px-4 py-2 text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors rounded-lg"
          >
            Continue Without
          </Button>
        </div>
      </div>
    </div>
  );
};
