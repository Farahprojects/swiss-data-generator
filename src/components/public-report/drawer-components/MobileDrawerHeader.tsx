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
      className="flex items-center justify-between px-6 py-2 bg-white/95 backdrop-blur-xl border-b border-gray-100/50"
      style={{ paddingTop: `${topSafePadding + 8}px` }}
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
                    ? 'bg-[hsl(var(--apple-blue))] scale-125 shadow-sm' 
                    : 'bg-[hsl(var(--apple-gray-light))] scale-100'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-light text-[hsl(var(--apple-gray-dark))] tracking-wide">
            {currentStep} of {totalSteps}
          </span>
        </div>
      </div>
      
      {/* Elegant close button */}
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-full bg-[hsl(var(--apple-gray-light))]/50 hover:bg-[hsl(var(--apple-gray-light))] transition-all duration-300 ease-out active:scale-95 flex items-center justify-center backdrop-blur-sm"
        aria-label="Close"
      >
        <X className="h-3.5 w-3.5 text-[hsl(var(--apple-gray-dark))]" />
      </button>
    </div>
  );
};

export default MobileDrawerHeader;