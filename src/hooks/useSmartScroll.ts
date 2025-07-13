import { useCallback, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ScrollOptions {
  behavior?: 'smooth' | 'instant';
  block?: 'start' | 'center' | 'end' | 'nearest';
  offset?: number;
  delay?: number;
}

export const useSmartScroll = () => {
  const isMobile = useIsMobile();
  const isScrollingRef = useRef(false);

  const isElementVisible = useCallback((element: Element): boolean => {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= viewportHeight &&
      rect.right <= viewportWidth
    );
  }, []);

  const scrollToElement = useCallback((
    elementOrSelector: Element | string,
    options: ScrollOptions = {}
  ) => {
    if (!isMobile || isScrollingRef.current) return;

    const {
      behavior = 'smooth',
      block = 'center',
      offset = 0,
      delay = 0
    } = options;

    const element = typeof elementOrSelector === 'string' 
      ? document.querySelector(elementOrSelector)
      : elementOrSelector;

    if (!element) return;

    // Check if element is already visible
    if (isElementVisible(element)) return;

    isScrollingRef.current = true;

    const performScroll = () => {
      try {
        if (offset !== 0) {
          // Custom scroll with offset
          const rect = element.getBoundingClientRect();
          const targetY = rect.top + window.pageYOffset + offset;
          
          window.scrollTo({
            top: targetY,
            behavior
          });
        } else {
          // Standard scroll
          element.scrollIntoView({
            behavior,
            block,
            inline: 'nearest'
          });
        }
      } catch (error) {
        console.warn('Smart scroll error:', error);
      } finally {
        // Reset scrolling flag after animation completes
        setTimeout(() => {
          isScrollingRef.current = false;
        }, behavior === 'smooth' ? 500 : 100);
      }
    };

    if (delay > 0) {
      setTimeout(performScroll, delay);
    } else {
      performScroll();
    }
  }, [isMobile, isElementVisible]);

  const scrollToNextField = useCallback((currentFieldId: string) => {
    // Define field progression order
    const fieldOrder = [
      'name', 'secondPersonName',
      'email',
      'birthDate', 'secondPersonBirthDate', 
      'birthTime', 'secondPersonBirthTime',
      'birthLocation', 'secondPersonBirthLocation'
    ];

    const currentIndex = fieldOrder.indexOf(currentFieldId);
    if (currentIndex === -1 || currentIndex === fieldOrder.length - 1) return;

    const nextFieldId = fieldOrder[currentIndex + 1];
    const nextField = document.getElementById(nextFieldId);
    
    if (nextField) {
      scrollToElement(nextField, { delay: 200, block: 'center' });
    }
  }, [scrollToElement]);

  return {
    scrollToElement,
    scrollToNextField,
    isElementVisible
  };
};