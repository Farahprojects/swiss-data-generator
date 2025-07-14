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
      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium text-gray-500">
          Step {currentStep} of {totalSteps}
        </span>
        <div className="flex space-x-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i + 1 <= currentStep ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};

export default MobileDrawerHeader;