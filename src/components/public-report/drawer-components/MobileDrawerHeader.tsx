import React from 'react';
import { X } from 'lucide-react';
import { useMobileSafeTopPadding } from '@/hooks/useMobileSafeTopPadding';

interface MobileDrawerHeaderProps {
  currentStep: number;
  totalSteps: number;
  onClose: () => void;
}

const MobileDrawerHeader = ({ currentStep, totalSteps, onClose }: MobileDrawerHeaderProps) => {
  const topSafePadding = useMobileSafeTopPadding();

  return (
    <div 
      className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100"
      style={{ paddingTop: `${topSafePadding + 16}px` }}
    >
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-[hsl(var(--apple-gray-dark))]">
          Step {currentStep} of {totalSteps}
        </span>
        <div className="flex space-x-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ease-out ${
                i + 1 <= currentStep 
                  ? 'bg-[hsl(var(--apple-blue))] scale-110' 
                  : 'bg-[hsl(var(--apple-gray-light))]'
              }`}
            />
          ))}
        </div>
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-full bg-[hsl(var(--apple-gray-light))] hover:bg-[hsl(var(--apple-gray))] transition-all duration-300 ease-out active:scale-95 flex items-center justify-center"
      >
        <X className="h-4 w-4 text-[hsl(var(--apple-gray-dark))]" />
      </button>
    </div>
  );
};

export default MobileDrawerHeader;