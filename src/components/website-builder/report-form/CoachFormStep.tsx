
import React from 'react';

interface CoachFormStepProps {
  stepNumber: number;
  title: string;
  children: React.ReactNode;
  className?: string;
  themeColor: string;
  fontFamily: string;
}

const CoachFormStep: React.FC<CoachFormStepProps> = ({ 
  stepNumber, 
  title, 
  children, 
  className = '', 
  themeColor,
  fontFamily 
}) => {
  return (
    <section 
      className={`min-h-screen flex items-center justify-center py-16 ${className}`}
      style={{ fontFamily: `${fontFamily}, sans-serif` }}
    >
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
          <div className="space-y-8">
            <div className="flex items-center justify-center gap-4">
              <div 
                className="rounded-full w-12 h-12 flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                style={{ backgroundColor: themeColor }}
              >
                {stepNumber}
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold text-center">{title}</h2>
            </div>
            <div className="max-w-2xl mx-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CoachFormStep;
