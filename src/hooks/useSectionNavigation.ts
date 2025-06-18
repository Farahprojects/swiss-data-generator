
import { useState, useEffect, useRef } from 'react';

interface UseSectionNavigationProps {
  sectionIds: string[];
  offset?: number;
}

export const useSectionNavigation = ({ 
  sectionIds, 
  offset = 100 
}: UseSectionNavigationProps) => {
  const [currentSection, setCurrentSection] = useState(0);
  const isScrollingRef = useRef(false);

  const scrollToSection = (sectionIndex: number) => {
    const sectionId = sectionIds[sectionIndex];
    const element = document.getElementById(sectionId);
    
    if (element) {
      isScrollingRef.current = true;
      
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      // Reset scrolling flag after animation
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 1000);
      
      setCurrentSection(sectionIndex);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const scrollPosition = window.scrollY + offset;
      
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const element = document.getElementById(sectionIds[i]);
        if (element && element.offsetTop <= scrollPosition) {
          setCurrentSection(i);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, [sectionIds, offset]);

  return {
    currentSection,
    scrollToSection
  };
};
