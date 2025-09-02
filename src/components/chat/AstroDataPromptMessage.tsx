import React from 'react';
import { Sparkles, MessageCircle } from 'lucide-react';
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
    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl max-w-2xl lg:max-w-4xl">
      {/* Bot Avatar */}
      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
        <MessageCircle className="w-5 h-5 text-white" />
      </div>
      
      {/* Message Content */}
      <div className="flex-1 space-y-4">
        <div className="space-y-2">
          <h3 className="text-base font-medium text-gray-900">
            Welcome! 👋
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Would you like to add your astrological data for a more personalized experience? 
            This will help me provide insights tailored to your unique chart.
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={onAddAstroData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded-lg"
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
        
        <p className="text-xs text-gray-500">
          You can always add astro data later from the settings menu
        </p>
      </div>
    </div>
  );
};
