import React, { useEffect, useRef, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileFormProtectorProps {
  children: React.ReactNode;
  isOpen: boolean;
}

const MobileFormProtector: React.FC<MobileFormProtectorProps> = ({ children, isOpen }) => {
  const isMobile = useIsMobile();
  const protectorRef = useRef<HTMLDivElement>(null);
  const originalViewport = useRef<string>('');

  // Store original viewport meta tag
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        originalViewport.current = viewportMeta.getAttribute('content') || '';
      }
    }
  }, []);

  // Lock down viewport and prevent body scroll when form is open
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const preventBodyScroll = () => {
      // Only prevent body scroll, don't fix position
      document.body.style.overflow = 'hidden';
    };

    const restoreBodyScroll = () => {
      document.body.style.overflow = '';
    };

    const lockViewport = () => {
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
      }
    };

    const restoreViewport = () => {
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta && originalViewport.current) {
        viewportMeta.setAttribute('content', originalViewport.current);
      }
    };

    // Apply protections
    preventBodyScroll();
    lockViewport();

    // Cleanup on unmount or when form closes
    return () => {
      restoreBodyScroll();
      restoreViewport();
    };
  }, [isMobile, isOpen]);

  // Enhanced keyboard event handling
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Prevent form submission on Enter (except in textareas)
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      e.stopPropagation();
    }

    // Prevent Escape key from closing the form
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
    }

    // Prevent Tab from moving outside the form
    if (e.key === 'Tab') {
      const focusableElements = protectorRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, []);

  // Focus trap - removed to prevent scroll interference
  const handleFocusIn = useCallback((e: FocusEvent) => {
    // Removed focus trap to prevent unwanted scrolling
    // Let users navigate naturally
  }, []);

  // Prevent touch events that could interfere with form
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Prevent double-tap zoom
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Allow all touch move events within the form
    // The form's scrollable areas will handle their own scrolling
    e.stopPropagation();
  }, []);

  // Prevent form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Prevent context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Set up focus trap when form opens
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    document.addEventListener('focusin', handleFocusIn);
    
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [isMobile, isOpen, handleFocusIn]);

  // Only apply protections on mobile
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div
      ref={protectorRef}
      className="mobile-form-protector"
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onSubmit={handleSubmit}
      onContextMenu={handleContextMenu}
      style={{
        touchAction: 'pan-y',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        position: 'relative',
        isolation: 'isolate',
        zIndex: 1000,
      }}
    >
      {children}
    </div>
  );
};

export default MobileFormProtector; 