import { useEffect, useRef } from 'react';
import { useIsMobile } from './use-mobile';

/**
 * Professional keyboard handling - reads --kb CSS var set by useSafeBottomPadding
 * Applies transform to move input above keyboard
 */
export const useKeyboardAwareInput = () => {
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Only run on mobile devices - use consistent mobile detection
    if (typeof window === 'undefined' || !isMobile) return;
    
    const container = inputContainerRef.current;
    if (!container) {
      console.warn('[useKeyboardAwareInput] Container ref not attached');
      return;
    }

    console.log('[useKeyboardAwareInput] Initialized for mobile keyboard handling');

    let rafId: number | null = null;

    const updatePosition = () => {
      if (rafId !== null) return;
      
      rafId = requestAnimationFrame(() => {
        rafId = null;
        
        // Read keyboard height from CSS var (set by useSafeBottomPadding)
        const kbHeight = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue('--kb') || '0'
        );
        
        console.log('[useKeyboardAwareInput] Keyboard height from --kb:', kbHeight);
        
        // Apply transform to move input above keyboard
        if (kbHeight > 0) {
          container.style.transform = `translateY(-${kbHeight}px)`;
          container.style.transition = 'transform 0.2s ease-out';
          console.log('[useKeyboardAwareInput] Applied transform:', `translateY(-${kbHeight}px)`);
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
  }, [isMobile]);

  return inputContainerRef;
};

