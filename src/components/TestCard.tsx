
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
      className={`p-4 border-l-4 cursor-pointer transition-all duration-300 ${
        isActive 
          ? 'border-primary bg-primary/5 shadow-sm' 
          : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
      }`}
      onMouseEnter={onHover}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-sm text-gray-600">{description}</p>}
        </div>
      </div>
    </div>
  );
};
