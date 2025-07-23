import { useCallback, useEffect, useRef } from 'react';

interface ScrollPosition {
  element: Element;
  top: number;
}

/**
 * A clean, reusable hook for managing scroll targets throughout the report flow.
 * Captures scroll position when CTA is clicked and restores it after payment.
 */
export const useScrollTarget = () => {
  const savedScrollPosition = useRef<ScrollPosition | null>(null);

  /**
   * Capture the current scroll target - called when CTA buttons are clicked
   */
  const captureScrollTarget = useCallback(() => {
    const step1Element = document.querySelector('[data-step="1"]');
    if (step1Element) {
      savedScrollPosition.current = {
        element: step1Element,
        top: step1Element.getBoundingClientRect().top + window.scrollY
      };
      console.log('📍 Scroll target captured:', {
        elementTag: step1Element.tagName,
        top: savedScrollPosition.current.top
      });
    }
  }, []);

  /**
   * Restore scroll to the captured position - called after payment success
   */
  const restoreScrollTarget = useCallback(() => {
    if (!savedScrollPosition.current) {
      console.log('📍 No scroll target to restore');
      return;
    }

    const { element, top } = savedScrollPosition.current;
    
    // Verify element still exists
    if (document.contains(element)) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      console.log('📍 Scroll target restored via element');
    } else {
      // Fallback to saved position if element is gone
      window.scrollTo({ 
        top, 
        behavior: 'smooth' 
      });
      console.log('📍 Scroll target restored via position:', top);
    }
  }, []);

  /**
   * Enhanced CTA click handler that captures position before scrolling
   */
  const handleCtaClick = useCallback(() => {
    captureScrollTarget();
    
    // Perform the original scroll behavior
    const step1Element = document.querySelector('[data-step="1"]');
    if (step1Element) {
      step1Element.scrollIntoView({ behavior: 'smooth' });
    }
  }, [captureScrollTarget]);

  /**
   * Clear saved position when starting fresh
   */
  const clearScrollTarget = useCallback(() => {
    savedScrollPosition.current = null;
    console.log('📍 Scroll target cleared');
  }, []);

  return {
    captureScrollTarget,
    restoreScrollTarget,
    handleCtaClick,
    clearScrollTarget,
    hasScrollTarget: !!savedScrollPosition.current
  };
};