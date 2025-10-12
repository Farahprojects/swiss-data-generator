import { useEffect, useRef } from 'react';

/**
 * Professional keyboard handling using Visual Viewport API
 * Used by WhatsApp, Telegram, Slack - the bulletproof approach
 */
export const useKeyboardAwareInput = () => {
  const inputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run on mobile devices
    if (typeof window === 'undefined' || window.innerWidth > 768) return;
    
    // Check if Visual Viewport API is supported
    if (!window.visualViewport) {
      console.warn('[useKeyboardAwareInput] Visual Viewport API not supported');
      return;
    }

    const viewport = window.visualViewport;
    const container = inputContainerRef.current;
    if (!container) return;

    const handleViewportChange = () => {
      // Calculate how much the viewport has shrunk (keyboard height)
      const keyboardHeight = window.innerHeight - viewport.height;
      
      // Adjust input position to stay above keyboard
      if (keyboardHeight > 0) {
        // Keyboard is open - move input up
        container.style.transform = `translateY(-${keyboardHeight}px)`;
        container.style.transition = 'transform 0.2s ease-out';
      } else {
        // Keyboard is closed - reset position
        container.style.transform = 'translateY(0)';
        container.style.transition = 'transform 0.2s ease-out';
      }
    };

    // Listen to viewport changes (keyboard open/close)
    viewport.addEventListener('resize', handleViewportChange);
    viewport.addEventListener('scroll', handleViewportChange);

    // Cleanup
    return () => {
      viewport.removeEventListener('resize', handleViewportChange);
      viewport.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  return inputContainerRef;
};

