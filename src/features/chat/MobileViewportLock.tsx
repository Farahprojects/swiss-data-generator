import React, { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  active?: boolean;
  children: React.ReactNode;
}

// Minimal viewport/body lock mirroring the public report mobile protector behavior
export const MobileViewportLock: React.FC<Props> = ({ active = true, children }) => {
  const isMobile = useIsMobile();
  const originalViewport = useRef<string>('');
  const originalBodyOverflow = useRef<string>('');

  useEffect(() => {
    if (!isMobile || !active) return;

    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      originalViewport.current = viewportMeta.getAttribute('content') || '';
      // Preserve interactive-widget=overlays-content for keyboard handling
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=overlays-content'
      );
    }

    originalBodyOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      // Restore body scroll
      document.body.style.overflow = originalBodyOverflow.current;
      // Restore viewport meta
      const vp = document.querySelector('meta[name="viewport"]');
      if (vp && originalViewport.current) {
        vp.setAttribute('content', originalViewport.current);
      }
    };
  }, [isMobile, active]);

  return <>{children}</>;
};


