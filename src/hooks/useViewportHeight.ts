
import { useEffect } from 'react';

export const useViewportHeight = () => {
  useEffect(() => {
    const updateViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set initial height
    updateViewportHeight();

    // Update on resize and orientation change (handles keyboard show/hide)
    const handleResize = () => {
      // Use requestAnimationFrame to ensure smooth updates
      requestAnimationFrame(updateViewportHeight);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    
    // Also handle visual viewport changes for better keyboard support
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize, { passive: true });
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);
};
