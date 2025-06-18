
import React, { useState, useEffect } from 'react';
import { useSectionJumping } from '@/hooks/useSectionJumping';

interface SectionJumpingProps {
  showSecondPerson: boolean;
}

const SectionJumping: React.FC<SectionJumpingProps> = ({ showSecondPerson }) => {
  const { jumpToSection, isMobile } = useSectionJumping();
  const [isVisible, setIsVisible] = useState(false);

  const sections = [
    { id: 'choose-report', label: '1' },
    { id: 'contact-info', label: '2' },
    { id: 'birth-details', label: '3' },
    ...(showSecondPerson ? [{ id: 'second-person', label: '4' }] : []),
    { id: 'features', label: 'F' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.getElementById('hero');
      if (heroSection) {
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
        setIsVisible(window.scrollY > heroBottom - 100);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible || !isMobile) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-background/90 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
        <div className="flex flex-col gap-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => jumpToSection(section.id)}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center"
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectionJumping;
