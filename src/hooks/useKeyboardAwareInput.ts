import { useEffect, useRef } from 'react';

/**
 * Professional keyboard handling - reads --kb CSS var set by useSafeBottomPadding
 * Applies transform to move input above keyboard
 */
export const useKeyboardAwareInput = () => {
  const inputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run on mobile devices
    if (typeof window === 'undefined' || window.innerWidth > 768) return;
    
    const container = inputContainerRef.current;
    if (!container) return;

    let rafId: number | null = null;

    const updatePosition = () => {
      if (rafId !== null) return;
      
      rafId = requestAnimationFrame(() => {
        rafId = null;
        
        // Read keyboard height from CSS var (set by useSafeBottomPadding)
        const kbHeight = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue('--kb') || '0'
        );
        
        // Apply transform to move input above keyboard
        if (kbHeight > 0) {
          container.style.transform = `translateY(-${kbHeight}px)`;
          container.style.transition = 'transform 0.2s ease-out';
        } else {
          container.style.transform = 'translateY(0)';
          container.style.transition = 'transform 0.2s ease-out';
        }
      });
    };

    // Listen to CSS var changes (when useSafeBottomPadding updates --kb)
    const observer = new MutationObserver(updatePosition);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });

    // Initial update
    updatePosition();

    // Cleanup
    return () => {
      observer.disconnect();
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return inputContainerRef;
};

