
import { useEffect, useRef } from 'react';

interface UseTabVisibilityOptions {
  onTabHidden?: () => void;
  onTabVisible?: () => void;
  pausePollingOnHidden?: boolean;
}

export const useTabVisibility = (options: UseTabVisibilityOptions = {}) => {
  const { onTabHidden, onTabVisible, pausePollingOnHidden = true } = options;
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      if (isVisible !== isVisibleRef.current) {
        isVisibleRef.current = isVisible;
        
        if (isVisible) {
          onTabVisible?.();
          // Broadcast that this tab is now active
          localStorage.setItem('activeTab', Date.now().toString());
        } else {
          onTabHidden?.();
        }
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Check if another tab is already active
    const checkOtherTabs = () => {
      const lastActive = localStorage.getItem('activeTab');
      if (lastActive) {
        const timeSinceLastActive = Date.now() - parseInt(lastActive);
        // If another tab was active within last 5 seconds, this tab should pause
        if (timeSinceLastActive < 5000 && !document.hidden) {
          onTabHidden?.();
        }
      }
    };

    // Check on mount
    checkOtherTabs();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onTabHidden, onTabVisible]);

  return {
    isVisible: isVisibleRef.current,
    pausePollingOnHidden
  };
};
