
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface SectionNavigationProps {
  currentSection: number;
  totalSections: number;
  onSectionChange: (section: number) => void;
}

const SectionNavigation: React.FC<SectionNavigationProps> = ({
  currentSection,
  totalSections,
  onSectionChange
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsVisible(scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (direction: 'up' | 'down') => {
    const newSection = direction === 'up' 
      ? Math.max(0, currentSection - 1)
      : Math.min(totalSections - 1, currentSection + 1);
    
    onSectionChange(newSection);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-50 flex flex-col gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => scrollToSection('up')}
        disabled={currentSection === 0}
        className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      
      <div className="bg-white/90 backdrop-blur-sm rounded-md px-3 py-2 shadow-lg">
        <span className="text-sm font-medium">
          {currentSection + 1}/{totalSections}
        </span>
      </div>
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => scrollToSection('down')}
        disabled={currentSection === totalSections - 1}
        className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default SectionNavigation;
