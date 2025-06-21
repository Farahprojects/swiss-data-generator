
import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface TestCardProps {
  title: string;
  description: string;
  path: string;
  isActive: boolean;
  onHover: () => void;
  onExplore?: () => void;
  icon: LucideIcon;
}

export const TestCard = ({ title, description, path, isActive, onHover, onExplore, icon: Icon }: TestCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleExploreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onExplore) {
      onExplore();
    }
  };

  return (
    <div 
      className="py-2 px-4 cursor-pointer transition-all duration-300"
      onMouseEnter={() => {
        onHover();
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 text-left">
          <h3 className={`text-4xl font-black transition-all duration-300 ${
            isActive || isHovered 
              ? 'text-primary' 
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
            onClick={handleExploreClick}
            className={`px-4 py-2 rounded-full font-semibold transition-all duration-300 ${
              isActive || isHovered
                ? 'bg-primary text-white opacity-100 translate-x-0'
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
