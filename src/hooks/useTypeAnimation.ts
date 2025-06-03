
import { useState, useEffect, useCallback, useRef } from 'react';

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

  const startTyping = useCallback(() => {
    if (!targetText || isInterruptedRef.current) return;

    setIsTyping(true);
    setDisplayText('');
    currentIndexRef.current = 0;
    setShowCursor(true);

    const typeNextCharacter = () => {
      if (isInterruptedRef.current) return;

      if (currentIndexRef.current < targetText.length) {
        const char = targetText[currentIndexRef.current];
        const isPunctuation = /[.!?,:;]/.test(char);
        
        setDisplayText(targetText.slice(0, currentIndexRef.current + 1));
        currentIndexRef.current++;

        // Add delay for punctuation to make it feel more natural
        const delay = isPunctuation ? punctuationDelay : speed;
        
        timeoutRef.current = setTimeout(typeNextCharacter, delay);
      } else {
        // Animation complete
        setIsTyping(false);
        setShowCursor(false);
        onComplete?.();
      }
    };

    typeNextCharacter();
  }, [targetText, speed, punctuationDelay, onComplete]);

  const stopTyping = useCallback(() => {
    isInterruptedRef.current = true;
    setIsTyping(false);
    setShowCursor(false);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    onInterrupt?.();
  }, [onInterrupt]);

  const resetAnimation = useCallback(() => {
    isInterruptedRef.current = false;
    setDisplayText('');
    setIsTyping(false);
    setShowCursor(false);
    currentIndexRef.current = 0;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  useEffect(() => {
    if (startAnimation && targetText) {
      resetAnimation();
      // Small delay to ensure state is reset
      setTimeout(startTyping, 50);
    }
  }, [startAnimation, targetText, startTyping, resetAnimation]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    displayText,
    isTyping,
    showCursor,
    stopTyping,
    resetAnimation
  };
};
