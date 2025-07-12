import { useState, useEffect, useCallback, useRef } from 'react';
import { log } from '@/utils/logStub';

interface UseTypeAnimationOptions {
  speed?: number;
  punctuationDelay?: number;
  onComplete?: () => void;
  onInterrupt?: () => void;
}

export const useTypeAnimation = (
  targetText: string,
  startAnimation: boolean,
  options: UseTypeAnimationOptions = {}
) => {
  const {
    speed = 50,
    punctuationDelay = 200,
    onComplete,
    onInterrupt
  } = options;

  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCursor, setShowCursor] = useState(false);
  const currentIndexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInterruptedRef = useRef(false);
  const lastTargetTextRef = useRef('');
  const animationRunningRef = useRef(false);

  // Cursor blinking effect
  useEffect(() => {
    if (isTyping || showCursor) {
      intervalRef.current = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 530);
    } else {
      setShowCursor(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTyping]);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTyping = useCallback(() => {
    if (!targetText || isInterruptedRef.current || animationRunningRef.current) {
      log('debug', 'startTyping aborted', { 
        hasTargetText: !!targetText, 
        interrupted: isInterruptedRef.current, 
        running: animationRunningRef.current 
      });
      return;
    }

    log('debug', 'Starting type animation', { textLength: targetText.length });
    animationRunningRef.current = true;
    setIsTyping(true);
    setDisplayText('');
    currentIndexRef.current = 0;
    setShowCursor(true);

    const typeNextCharacter = () => {
      if (isInterruptedRef.current || !animationRunningRef.current) {
        log('debug', 'Animation stopped');
        return;
      }

      if (currentIndexRef.current < targetText.length) {
        const char = targetText[currentIndexRef.current];
        const isPunctuation = /[.!?,:;]/.test(char);
        
        setDisplayText(targetText.slice(0, currentIndexRef.current + 1));
        currentIndexRef.current++;

        const delay = isPunctuation ? punctuationDelay : speed;
        timeoutRef.current = setTimeout(typeNextCharacter, delay);
      } else {
        // Animation complete
        log('debug', 'Type animation complete');
        animationRunningRef.current = false;
        setIsTyping(false);
        setShowCursor(false);
        onComplete?.();
      }
    };

    typeNextCharacter();
  }, [targetText, speed, punctuationDelay, onComplete]);

  const stopTyping = useCallback(() => {
    log('debug', 'Stopping type animation');
    isInterruptedRef.current = true;
    animationRunningRef.current = false;
    setIsTyping(false);
    setShowCursor(false);
    clearTimeouts();
    onInterrupt?.();
  }, [onInterrupt, clearTimeouts]);

  const resetAnimation = useCallback(() => {
    log('debug', 'Resetting type animation');
    isInterruptedRef.current = false;
    animationRunningRef.current = false;
    setDisplayText('');
    setIsTyping(false);
    setShowCursor(false);
    currentIndexRef.current = 0;
    clearTimeouts();
  }, [clearTimeouts]);

  // Trigger animation when startAnimation changes from false to true
  useEffect(() => {
    if (startAnimation && targetText && targetText !== lastTargetTextRef.current) {
      lastTargetTextRef.current = targetText;
      resetAnimation();
      // Small delay to ensure state is reset
      const startTimeout = setTimeout(() => {
        startTyping();
      }, 50);
      
      return () => clearTimeout(startTimeout);
    }
  }, [startAnimation, targetText]); // Removed startTyping and resetAnimation from deps

  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    displayText,
    isTyping,
    showCursor,
    stopTyping,
    resetAnimation
  };
};
