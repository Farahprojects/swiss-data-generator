import { useState, useEffect, useRef, useCallback } from 'react';

export const useCountdown = (
  initialTime: number = 24,
  shouldStart: boolean = false,
  onComplete?: () => void
) => {
  const [countdown, setCountdown] = useState(initialTime);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const resetCountdown = useCallback(() => {
    setCountdown(initialTime);
    if (countdownRef.current) {
      clearTimeout(countdownRef.current);
      countdownRef.current = null;
    }
  }, [initialTime]);

  const startCountdown = useCallback(() => {
    if (countdownRef.current) return; // Already running
    
    const tick = () => {
      setCountdown((prevCount) => {
        if (prevCount <= 1) {
          onComplete?.();
          return 0;
        }
        
        countdownRef.current = setTimeout(tick, 1000);
        return prevCount - 1;
      });
    };
    
    countdownRef.current = setTimeout(tick, 1000);
  }, [onComplete]);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearTimeout(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (shouldStart) {
      startCountdown();
    } else {
      stopCountdown();
    }

    return () => {
      stopCountdown();
    };
  }, [shouldStart, startCountdown, stopCountdown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, []);

  return {
    countdown,
    resetCountdown,
    startCountdown,
    stopCountdown,
    isRunning: countdownRef.current !== null
  };
};