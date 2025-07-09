import { useEffect, useState } from 'react';

export const useMobileAutocomplete = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [shouldUseFallback, setShouldUseFallback] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(mobile);
      
      // Check for known mobile browser issues with Google Web Components
      const isOldAndroid = /Android [1-4]\./.test(navigator.userAgent);
      const isOldIOS = /OS [1-9]_/.test(navigator.userAgent);
      const hasLowMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 2;
      
      if (mobile && (isOldAndroid || isOldIOS || hasLowMemory)) {
        console.warn('🚨 Detected older mobile device or low memory, using fallback input');
        setShouldUseFallback(true);
      }
    }
  }, []);

  return {
    isMobile,
    shouldUseFallback
  };
};