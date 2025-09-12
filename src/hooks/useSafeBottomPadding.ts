import { useEffect } from 'react';

/**
 * Sets a CSS var --vv-bottom to account for mobile browser UI (URL/home bars)
 * Uses VisualViewport when available and falls back to 0.
 * Combine with env(safe-area-inset-bottom) in CSS for a universal padding.
 */
export function useSafeBottomPadding(): void {
  useEffect(() => {
    let rafId: number | null = null;
    const scheduleUpdate = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        try {
          const vv = (window as any).visualViewport as VisualViewport | undefined;
          const layoutH = window.innerHeight || document.documentElement.clientHeight;
          const layoutW = window.innerWidth || document.documentElement.clientWidth;
          if (vv) {
            const extraBottom = Math.max(0, Math.round(layoutH - vv.height - vv.offsetTop));
            const extraRight = Math.max(0, Math.round(layoutW - vv.width - vv.offsetLeft));
            const kb = Math.max(0, Math.round(layoutH - vv.height));
            document.documentElement.style.setProperty('--vv-bottom', `${extraBottom}px`);
            document.documentElement.style.setProperty('--vv-top', `${Math.max(0, Math.round(vv.offsetTop))}px`);
            document.documentElement.style.setProperty('--vv-left', `${Math.max(0, Math.round(vv.offsetLeft))}px`);
            document.documentElement.style.setProperty('--vv-right', `${extraRight}px`);
            document.documentElement.style.setProperty('--kb', `${kb}px`);
          } else {
            document.documentElement.style.setProperty('--vv-bottom', '0px');
            document.documentElement.style.setProperty('--vv-top', '0px');
            document.documentElement.style.setProperty('--vv-left', '0px');
            document.documentElement.style.setProperty('--vv-right', '0px');
            document.documentElement.style.setProperty('--kb', '0px');
          }
        } catch {
          document.documentElement.style.setProperty('--vv-bottom', '0px');
          document.documentElement.style.setProperty('--vv-top', '0px');
          document.documentElement.style.setProperty('--vv-left', '0px');
          document.documentElement.style.setProperty('--vv-right', '0px');
          document.documentElement.style.setProperty('--kb', '0px');
        }
      });
    };

    // Initial pass and a small Samsung baseline buffer
    scheduleUpdate();
    const ua = navigator.userAgent || '';
    if (/SamsungBrowser/i.test(ua)) {
      const current = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--vv-bottom')) || 0;
      const padded = Math.max(current, 50);
      document.documentElement.style.setProperty('--vv-bottom', `${padded}px`);
    }
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    if (vv) {
      vv.addEventListener('resize', scheduleUpdate, { passive: true } as AddEventListenerOptions);
      vv.addEventListener('scroll', scheduleUpdate, { passive: true } as AddEventListenerOptions);
    }
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    // Try enabling VirtualKeyboard overlays (Android, Samsung, Chrome)
    try {
      const anyNav = navigator as any;
      if (anyNav && anyNav.virtualKeyboard) {
        anyNav.virtualKeyboard.overlaysContent = true;
        const onGeometry = () => {
          try {
            const rect = anyNav.virtualKeyboard.boundingRect;
            const height = rect ? Math.max(0, Math.round(rect.height)) : 0;
            document.documentElement.style.setProperty('--kb', `${height}px`);
          } catch {}
        };
        anyNav.virtualKeyboard.addEventListener('geometrychange', onGeometry);
        // Seed once
        onGeometry();
      }
    } catch {}

    return () => {
      if (vv) {
        vv.removeEventListener('resize', scheduleUpdate as EventListener);
        vv.removeEventListener('scroll', scheduleUpdate as EventListener);
      }
      window.removeEventListener('resize', scheduleUpdate as EventListener);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);
}


