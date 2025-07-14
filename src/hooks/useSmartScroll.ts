import { useCallback, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ScrollOptions {
  behavior?: 'smooth' | 'instant';
  block?: 'start' | 'center' | 'end' | 'nearest';
  offset?: number;
  delay?: number;
  inline?: ScrollLogicalPosition;
  fieldType?: 'text' | 'picker' | 'location';
}

type TargetElement = Element | HTMLElement | string;

export const useSmartScroll = () => {
  const isMobile = useIsMobile();
  const isScrollingRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --------- Check visibility within viewport ----------
  const isElementVisible = useCallback((element: Element): boolean => {
    const rect = element.getBoundingClientRect();
    const buffer = 20; // px buffer zone for early scroll

    return (
      rect.top >= 0 + buffer &&
      rect.bottom <= window.innerHeight - buffer
    );
  }, []);

  // --------- Debounced scroll function ----------------
  const debouncedScroll = useCallback(
    (target: TargetElement, options: ScrollOptions = {}) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        scrollToElement(target, options);
      }, 150);
    },
    []
  );

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
        fieldType = 'text',
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
          const rect = element.getBoundingClientRect();
          
          // Calculate smart offset based on field type and screen size
          let smartOffset = offset;
          if (smartOffset === 0) {
            const screenHeight = window.innerHeight;
            if (fieldType === 'picker') {
              smartOffset = -screenHeight * 0.25; // Show more context for pickers
            } else if (fieldType === 'location') {
              smartOffset = -screenHeight * 0.3; // Show more context for location autocomplete
            } else {
              smartOffset = -screenHeight * 0.2; // Default for text inputs
            }
          }
          
          if (smartOffset !== 0) {
            const scrollY = window.pageYOffset + rect.top + smartOffset;
            window.scrollTo({ top: Math.max(0, scrollY), behavior });
          } else {
            element.scrollIntoView({ behavior, block, inline });
          }
        } catch (err) {
          console.warn('Smart scroll error:', err);
        } finally {
          const duration = behavior === 'smooth' ? 600 : 100;
          setTimeout(() => {
            isScrollingRef.current = false;
          }, duration);
        }
      };

      const scrollWithDelay = () => {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => executeScroll(), {
            timeout: 500,
          });
        } else {
          setTimeout(executeScroll, delay || 200);
        }
      };

      // Add smart delay based on field type
      const smartDelay = delay > 0 ? delay : fieldType === 'picker' ? 300 : 150;
      
      if (smartDelay > 0) {
        setTimeout(scrollWithDelay, smartDelay);
      } else {
        scrollWithDelay();
      }
    },
    [isMobile, isElementVisible]
  );

  // --------- Enhanced scroll to next field with person context ----------
  const scrollToNextField = useCallback((currentFieldId: string, personNumber?: 1 | 2) => {
    const baseFields = ['name', 'email', 'birthDate', 'birthTime', 'birthLocation'];
    const person1Fields = baseFields;
    const person2Fields = baseFields.map(field => `secondPerson${field.charAt(0).toUpperCase() + field.slice(1)}`);
    
    let fieldOrder: string[];
    let currentIndex: number;
    
    if (personNumber === 2 || currentFieldId.startsWith('secondPerson')) {
      fieldOrder = person2Fields;
      currentIndex = person2Fields.indexOf(currentFieldId);
    } else {
      fieldOrder = person1Fields;
      currentIndex = person1Fields.indexOf(currentFieldId);
      
      // If we're at the end of person 1 fields, check if we should go to person 2
      if (currentIndex === person1Fields.length - 1) {
        const person2NameEl = document.getElementById('secondPersonName');
        if (person2NameEl) {
          debouncedScroll(person2NameEl, { fieldType: 'text', delay: 300 });
          return;
        }
      }
    }
    
    if (currentIndex === -1 || currentIndex === fieldOrder.length - 1) return;

    const nextId = fieldOrder[currentIndex + 1];
    const nextEl = document.getElementById(nextId);
    if (nextEl) {
      const fieldType = nextId.includes('Date') || nextId.includes('Time') ? 'picker' : 
                       nextId.includes('Location') ? 'location' : 'text';
      debouncedScroll(nextEl, { fieldType, delay: 200 });
    }
  }, [debouncedScroll]);

  return {
    scrollToElement,
    scrollToNextField,
    debouncedScroll,
    isElementVisible,
  };
};
