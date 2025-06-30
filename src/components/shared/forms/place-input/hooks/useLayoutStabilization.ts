
import { useCallback } from 'react';

export const useLayoutStabilization = (isMobile: boolean) => {
  return useCallback((containerRef: React.RefObject<HTMLDivElement>) => {
    if (!isMobile) return;
    
    // Prevent any scroll interference during processing
    document.body.style.overflow = 'hidden';
    
    // Wait for Google's popup to fully close and DOM to stabilize
    setTimeout(() => {
      // Force complete layout recalculation
      const container = containerRef.current;
      if (container) {
        // Reset container properties
        container.style.height = '48px';
        container.style.minHeight = '48px';
        container.style.maxHeight = '48px';
        container.style.position = 'relative';
        container.style.zIndex = '1';
        
        // Force reflow
        container.offsetHeight;
      }
      
      // Re-enable scroll
      document.body.style.overflow = '';
      
      // Gentle repositioning after full stabilization
      setTimeout(() => {
        const parentCard = container?.closest('[data-person]');
        if (parentCard && isMobile) {
          parentCard.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest',
            inline: 'nearest'
          });
        }
      }, 100);
    }, 300);
  }, [isMobile]);
};
