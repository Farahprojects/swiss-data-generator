
import React from 'react';
import { FormStepProps } from '@/types/public-report';
import { useMobileSafeTopPadding } from '@/hooks/useMobileSafeTopPadding';
import { useIsMobile } from '@/hooks/use-mobile';

const FormStep = ({ stepNumber, title, children, className = '', 'data-step': dataStep }: FormStepProps) => {
  const topSafePadding = useMobileSafeTopPadding();
  const isMobile = useIsMobile();
  
  const topPadding = isMobile ? `${topSafePadding + 24}px` : '24px';
  
  return (
    <section 
      className={`min-h-screen pb-12 ${className}`} 
      data-step={dataStep}
      style={{ paddingTop: topPadding }}
    >
      <div className="w-full px-4 container mx-auto max-w-5xl">
        <div className="space-y-8">
          <div className="flex items-center justify-center gap-4">
            <div className="bg-gray-200 text-gray-900 rounded-full w-12 h-12 flex items-center justify-center text-xl font-normal flex-shrink-0 border-2 border-gray-300">
              {stepNumber}
            </div>
            <h2 className="text-4xl lg:text-6xl font-light text-gray-900 tracking-tight">{title}</h2>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
};

export default FormStep;
