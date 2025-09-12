import { useEffect } from 'react';

/**
 * Sets a CSS var --vv-bottom to account for mobile browser UI (URL/home bars)
 * Uses VisualViewport when available and falls back to 0.
 * Combine with env(safe-area-inset-bottom) in CSS for a universal padding.
 */
export function useSafeBottomPadding(): void {
  useEffect(() => {
    const update = () => {
      try {
        const vv = (window as any).visualViewport as VisualViewport | undefined;
        if (vv) {
          const extra = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
          document.documentElement.style.setProperty('--vv-bottom', `${extra}px`);
        } else {
          document.documentElement.style.setProperty('--vv-bottom', '0px');
        }
      } catch {
        document.documentElement.style.setProperty('--vv-bottom', '0px');
      }
    };

    // Initial pass and a small Samsung baseline buffer
    update();
    const ua = navigator.userAgent || '';
    if (/SamsungBrowser/i.test(ua)) {
      const current = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--vv-bottom')) || 0;
      const padded = Math.max(current, 50);
      document.documentElement.style.setProperty('--vv-bottom', `${padded}px`);
    }
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }
    window.addEventListener('resize', update);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
      window.removeEventListener('resize', update);
    };
  }, []);
}


