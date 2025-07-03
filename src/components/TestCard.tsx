
import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

  const handleExploreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onExplore) {
      onExplore();
    }
  };

  const handleCardClick = () => {
    if (isMobile && onExplore) {
      onExplore();
    }
  };

  return (
    <div 
      className={`py-4 px-6 transition-all duration-500 group ${
        isMobile ? 'cursor-pointer' : 'cursor-pointer'
      }`}
      onMouseEnter={() => {
        onHover();
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      onClick={isMobile ? handleCardClick : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 text-center md:text-left">
          <h3 className={`text-4xl md:text-5xl font-light transition-all duration-500 whitespace-nowrap tracking-tight ${
            isActive || isHovered 
              ? 'text-gray-900' 
              : 'text-gray-500'
          }`}>
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-500 mt-2 font-light">{description}</p>
          )}
        </div>
        
        <div className="ml-8 hidden md:block">
          <button
            onClick={handleExploreClick}
            className={`px-8 py-3 rounded-full font-medium transition-all duration-500 transform ${
              isActive || isHovered
                ? 'bg-gray-900 text-white opacity-100 translate-x-0 scale-100 shadow-lg'
                : 'bg-gray-100 text-gray-500 opacity-70 -translate-x-4 scale-95'
            }`}
          >
            Explore
          </button>
        </div>
      </div>
    </div>
  );
};
