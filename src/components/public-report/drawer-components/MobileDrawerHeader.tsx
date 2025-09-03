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
          <div className="flex space-x-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full border-2 border-black transition-all duration-300 ease-out ${
                  i + 1 <= currentStep ? 'bg-black' : 'bg-white'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Elegant close button */}
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-full bg-[hsl(var(--apple-gray-light))]/50 hover:bg-[hsl(var(--apple-gray-light))] transition-all duration-300 ease-out active:scale-95 flex items-center justify-center backdrop-blur-sm"
        aria-label="Close"
      >
        <X className="h-5 w-5 text-[hsl(var(--apple-gray-dark))]" strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default MobileDrawerHeader;