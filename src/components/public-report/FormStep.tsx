
import React from 'react';
import { FormStepProps } from '@/types/public-report';

const FormStep = ({ stepNumber, title, children, className = '', 'data-step': dataStep }: FormStepProps) => {
  return (
    <section className={`min-h-screen py-12 ${className}`} data-step={dataStep}>
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="space-y-8">
          <div className="flex items-center justify-center gap-4">
            <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {stepNumber}
            </div>
            <h2 className="text-3xl font-semibold">{title}</h2>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
};

export default FormStep;
