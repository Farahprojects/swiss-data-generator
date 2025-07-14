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
}

const MobileDrawerFooter = ({ 
  currentStep, 
  totalSteps, 
  onPrevious, 
  onNext, 
  onSubmit,
  canGoNext, 
  isProcessing,
  isLastStep 
}: MobileDrawerFooterProps) => {
  const handleNextClick = () => {
    if (isLastStep) {
      onSubmit();
    } else {
      onNext();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 safe-area-pb">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="apple-secondary"
          onClick={onPrevious}
          disabled={currentStep === 1}
          className="flex items-center space-x-2 min-w-[120px]"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>

        <Button
          variant="apple-primary"
          onClick={handleNextClick}
          disabled={!canGoNext || isProcessing}
          className="flex items-center space-x-2 flex-1 max-w-[200px] justify-center"
        >
          <span>
            {isProcessing ? 'Processing...' : isLastStep ? 'Submit Order' : 'Continue'}
          </span>
          {!isProcessing && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default MobileDrawerFooter;