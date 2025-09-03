import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileDrawerFooterProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  canGoNext: boolean;
  isProcessing: boolean;
  isLastStep: boolean;
  hasTimedOut?: boolean;
}

const MobileDrawerFooter = ({ 
  currentStep, 
  totalSteps, 
  onPrevious, 
  onNext, 
  onSubmit,
  canGoNext, 
  isProcessing,
  isLastStep,
  hasTimedOut = false
}: MobileDrawerFooterProps) => {
  const handleNextClick = () => {
    if (isLastStep) {
      onSubmit();
    } else {
      onNext();
    }
  };

  return (
    <div className="bg-white border-t border-gray-100 px-6 py-4 safe-area-pb">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={currentStep === 1}
          className="flex items-center gap-2 px-6 py-3 rounded-full border-2 border-black text-black hover:bg-gray-50 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>

        <Button
          onClick={handleNextClick}
          disabled={!canGoNext || isProcessing}
          className="flex items-center gap-2 px-8 py-3 rounded-full bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 disabled:text-gray-200"
        >
          <span>
            {isProcessing 
              ? (isLastStep ? 'Processing payment...' : 'Processing...') 
              : hasTimedOut
                ? 'Try Again'
                : isLastStep 
                  ? 'Get Your Report' 
                  : 'Next'}
          </span>
          {!isProcessing && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default MobileDrawerFooter;