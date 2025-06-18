
import React from 'react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronRight } from 'lucide-react';

interface SectionInfo {
  id: string;
  label: string;
  visible: boolean;
}

interface SectionNavigationProps {
  sections: SectionInfo[];
  activeSection: string;
  showNavigation: boolean;
  onSectionClick: (sectionId: string) => void;
}

const SectionNavigation: React.FC<SectionNavigationProps> = ({
  sections,
  activeSection,
  showNavigation,
  onSectionClick
}) => {
  const isMobile = useIsMobile();
  
  if (!showNavigation) return null;
  
  const visibleSections = sections.filter(section => section.visible);
  
  if (visibleSections.length <= 1) return null;

  return (
    <div className={`fixed z-50 transition-all duration-300 ${
      showNavigation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    } ${
      isMobile 
        ? 'bottom-6 left-1/2 transform -translate-x-1/2' 
        : 'right-6 top-1/2 transform -translate-y-1/2'
    }`}>
      <div className={`bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-2 ${
        isMobile ? 'flex flex-row gap-1' : 'flex flex-col gap-1'
      }`}>
        {visibleSections.map((section, index) => {
          const isActive = section.id === activeSection;
          const isClickable = section.id !== 'hero-section'; // Don't make hero clickable
          
          return (
            <Button
              key={section.id}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => isClickable && onSectionClick(section.id)}
              disabled={!isClickable}
              className={`${
                isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'
              } ${
                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              } ${
                !isClickable ? 'opacity-60 cursor-default' : 'cursor-pointer'
              } transition-all duration-200`}
            >
              <span className={isMobile ? 'hidden' : 'block'}>
                {section.label}
              </span>
              <span className={isMobile ? 'block' : 'hidden'}>
                {index + 1}
              </span>
              {!isMobile && isClickable && (
                <ChevronRight className="h-3 w-3 ml-1" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default SectionNavigation;
