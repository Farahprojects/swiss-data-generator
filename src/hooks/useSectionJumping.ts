
import { useIsMobile } from './use-mobile';

export const useSectionJumping = () => {
  const isMobile = useIsMobile();

  const jumpToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return { jumpToSection, isMobile };
};
