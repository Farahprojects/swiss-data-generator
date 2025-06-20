
import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface TestCardProps {
  title: string;
  description: string;
  path: string;
  isActive: boolean;
  onHover: () => void;
  icon: LucideIcon;
}

export const TestCard = ({ title, description, path, isActive, onHover, icon: Icon }: TestCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`p-4 cursor-pointer transition-all duration-300 border-l-4 ${
        isActive || isHovered
          ? 'border-primary' 
          : 'border-transparent hover:border-primary/50'
      }`}
      onMouseEnter={() => {
        onHover();
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className={`text-3xl font-bold transition-all duration-300 ${
            isActive || isHovered 
              ? 'bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent' 
              : 'text-gray-900'
          }`}>
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-600 mt-2">{description}</p>
          )}
        </div>
        
        <div className="ml-6">
          <button
            className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
              isActive || isHovered
                ? 'bg-gradient-to-r from-primary to-secondary text-white opacity-100 translate-x-0'
                : 'bg-gray-200 text-gray-600 opacity-0 -translate-x-2'
            }`}
          >
            Explore
          </button>
        </div>
      </div>
    </div>
  );
};
