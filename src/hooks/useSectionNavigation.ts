
import { useState, useEffect, useCallback } from 'react';

interface SectionInfo {
  id: string;
  label: string;
  visible: boolean;
}

export const useSectionNavigation = (sections: SectionInfo[]) => {
  const [activeSection, setActiveSection] = useState<string>('');
  const [showNavigation, setShowNavigation] = useState(false);

  // Check which section is currently in view
  const checkActiveSection = useCallback(() => {
    const visibleSections = sections.filter(section => section.visible);
    
    for (const section of visibleSections) {
      const element = document.getElementById(section.id);
      if (element) {
        const rect = element.getBoundingClientRect();
        const elementHeight = rect.height;
        const windowHeight = window.innerHeight;
        
        // Consider section active if it's at least 30% visible
        if (rect.top <= windowHeight * 0.3 && rect.bottom >= windowHeight * 0.3) {
          setActiveSection(section.id);
          break;
        }
      }
    }
  }, [sections]);

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      // Show navigation after scrolling past hero section
      const heroElement = document.getElementById('hero-section');
      if (heroElement) {
        const heroRect = heroElement.getBoundingClientRect();
        setShowNavigation(heroRect.bottom < window.innerHeight * 0.5);
      }
      
      checkActiveSection();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [checkActiveSection]);

  // Smooth scroll to section
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80; // Account for any fixed headers
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, []);

  return {
    activeSection,
    showNavigation,
    scrollToSection
  };
};
