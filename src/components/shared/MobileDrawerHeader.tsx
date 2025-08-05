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
      className="flex items-center justify-between px-6 py-5 bg-white/95 backdrop-blur-xl border-b border-gray-100/50"
      style={{ paddingTop: `${topSafePadding + 16}px` }}
    >
      <div className="flex items-center space-x-6">
        {/* Elegant step indicator */}
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1.5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ease-out ${
                  i + 1 <= currentStep 
                    ? 'bg-gray-900 scale-125 shadow-sm' 
                    : 'bg-gray-300 scale-100'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-light text-gray-600 tracking-wide">
            {currentStep} of {totalSteps}
          </span>
        </div>
      </div>
      
      {/* Elegant close button */}
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-full bg-gray-200/50 hover:bg-gray-200 transition-all duration-300 ease-out active:scale-95 flex items-center justify-center backdrop-blur-sm"
        aria-label="Close"
      >
        <X className="h-3.5 w-3.5 text-gray-600" />
      </button>
    </div>
  );
};

export default MobileDrawerHeader;