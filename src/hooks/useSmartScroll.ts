import { useCallback, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ScrollOptions {
  behavior?: 'smooth' | 'instant';
  block?: 'start' | 'center' | 'end' | 'nearest';
  offset?: number;
  delay?: number;
  inline?: ScrollLogicalPosition;
}

type TargetElement = Element | HTMLElement | string;

export const useSmartScroll = () => {
  const isMobile = useIsMobile();
  const isScrollingRef = useRef(false);

  // --------- Check visibility within viewport ----------
  const isElementVisible = useCallback((element: Element): boolean => {
    const rect = element.getBoundingClientRect();
    const buffer = 20; // px buffer zone for early scroll

    return (
      rect.top >= 0 + buffer &&
      rect.bottom <= window.innerHeight - buffer
    );
  }, []);

  // --------- Main smart scroll function ----------------
  const scrollToElement = useCallback(
    (target: TargetElement, options: ScrollOptions = {}) => {
      if (!isMobile || isScrollingRef.current) return;

      const {
        behavior = 'smooth',
        block = 'center',
        inline = 'nearest',
        offset = 0,
        delay = 0,
      } = options;

      const element: Element | null =
        typeof target === 'string'
          ? document.querySelector(target)
          : target;

      if (!element) return;

      // Avoid redundant scroll if already visible
      if (isElementVisible(element)) return;

      isScrollingRef.current = true;

      const executeScroll = () => {
        try {
          if (offset !== 0) {
            const rect = element.getBoundingClientRect();
            const scrollY = window.pageYOffset + rect.top + offset;
            window.scrollTo({ top: scrollY, behavior });
          } else {
            element.scrollIntoView({ behavior, block, inline });
          }
        } catch (err) {
          console.warn('Smart scroll error:', err);
        } finally {
          const duration = behavior === 'smooth' ? 400 : 100;
          setTimeout(() => {
            isScrollingRef.current = false;
          }, duration);
        }
      };

      const scrollWithDelay = () => {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => executeScroll(), {
            timeout: 300,
          });
        } else {
          setTimeout(executeScroll, delay || 100);
        }
      };

      if (delay > 0) {
        setTimeout(scrollWithDelay, delay);
      } else {
        scrollWithDelay();
      }
    },
    [isMobile, isElementVisible]
  );

  // --------- Scroll to next field in logical form order ----------
  const scrollToNextField = useCallback((currentFieldId: string) => {
    const fieldOrder = [
      'name', 'secondPersonName',
      'email',
      'birthDate', 'secondPersonBirthDate',
      'birthTime', 'secondPersonBirthTime',
      'birthLocation', 'secondPersonBirthLocation',
    ];

    const currentIndex = fieldOrder.indexOf(currentFieldId);
    if (currentIndex === -1 || currentIndex === fieldOrder.length - 1) return;

    const nextId = fieldOrder[currentIndex + 1];
    const nextEl = document.getElementById(nextId);
    if (nextEl) {
      scrollToElement(nextEl, { delay: 200, block: 'center' });
    }
  }, [scrollToElement]);

  return {
    scrollToElement,
    scrollToNextField,
    isElementVisible,
  };
};
