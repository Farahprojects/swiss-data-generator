
import { useState, useEffect, useCallback } from 'react';

export const useTabVisibility = () => {
  const [isVisible, setIsVisible] = useState(() => 
    typeof document !== 'undefined' ? !document.hidden : true
  );
  const [wasHidden, setWasHidden] = useState(false);

  const handleVisibilityChange = useCallback(() => {
    if (typeof document === 'undefined') return;
    const isCurrentlyVisible = !document.hidden;
    
    if (!isCurrentlyVisible && isVisible) {
      // Tab is becoming hidden
      setWasHidden(true);
    } else if (isCurrentlyVisible && !isVisible) {
      // Tab is becoming visible again
      setWasHidden(false);
    }
    
    setIsVisible(isCurrentlyVisible);
  }, [isVisible]);

  useEffect(() => {
    // Skip in SSR environment
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also listen for focus/blur events as backup
    const handleFocus = () => setIsVisible(true);
    const handleBlur = () => setIsVisible(false);
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleVisibilityChange]);

  return { isVisible, wasHidden };
};
