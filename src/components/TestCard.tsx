
import React from 'react';
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
  return (
    <div
      className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all duration-300 ${
        isActive 
          ? 'border-l-primary bg-primary/5 shadow-md' 
          : 'border-l-gray-200 bg-white hover:border-l-primary/50 hover:bg-primary/5'
      }`}
      onMouseEnter={onHover}
    >
      <div className="flex items-center space-x-3">
        <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-gray-500'}`} />
        <div>
          <h3 className={`font-semibold ${isActive ? 'text-primary' : 'text-gray-800'}`}>
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};
