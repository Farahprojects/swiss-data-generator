
import { useEffect } from 'react';

export const useViewportHeight = () => {
  useEffect(() => {
    const isBrowser = typeof window !== 'undefined';
    if (!isBrowser) return;
    const MOBILE = 768;

    const setVH = () =>
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);

    const safeResize = () => {
      // Ignore keyboard-driven visualViewport resizes
      if (window.innerWidth > MOBILE) return;
      const lost = window.innerHeight - (window.visualViewport?.height ?? window.innerHeight);
      if (lost > 150) return;           // keyboard visible
      setVH();
    };

    setVH();
    window.addEventListener('orientationchange', setVH);
    window.addEventListener('resize', safeResize, { passive: true });

    return () => {
      window.removeEventListener('orientationchange', setVH);
      window.removeEventListener('resize', safeResize);
    };
  }, []);
};
