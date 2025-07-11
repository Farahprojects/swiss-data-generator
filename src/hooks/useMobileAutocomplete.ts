import { useEffect, useState } from 'react';

export const useMobileAutocomplete = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [shouldUseFallback, setShouldUseFallback] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(mobile);
      
      // Only fallback for genuinely old devices - let modern mobile browsers use native Google components
      const isVeryOldAndroid = /Android [1-4]\./.test(navigator.userAgent);
      const isVeryOldIOS = /OS [1-9]_/.test(navigator.userAgent);
      
      // Only fallback for extremely old devices, not all mobile
      if (isVeryOldAndroid || isVeryOldIOS) {
        console.warn('🚨 Detected very old mobile device, using fallback input');
        setShouldUseFallback(true);
      }
    }
  }, []);

  return {
    isMobile,
    shouldUseFallback
  };
};