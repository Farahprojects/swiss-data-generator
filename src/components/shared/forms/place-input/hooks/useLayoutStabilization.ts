
import { useCallback } from 'react';

// Simplified layout stabilization - unified approach
export const useLayoutStabilization = () => {
  return useCallback((containerRef: React.RefObject<HTMLDivElement>) => {
    // Minimal stabilization needed with unified approach
    const container = containerRef?.current;
    if (container) {
      // Force layout recalculation if needed
      container.offsetHeight;
    }
  }, []);
};
