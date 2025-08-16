// src/hooks/useTypewriter.ts
import { useState, useEffect } from 'react';

export const useTypewriter = (text: string, speed: number = 50) => {
  const [displayText, setDisplayText] = useState('');
  const [isReady, setIsReady] = useState(false);

  // Wait for text to be available and stable before starting animation
  useEffect(() => {
    if (!text || text.length === 0) {
      setDisplayText('');
      setIsReady(false);
      return;
    }

    // Add a small delay to ensure text is fully available
    const readyTimer = setTimeout(() => {
      setIsReady(true);
    }, 50); // 50ms delay to ensure text is stable

    return () => clearTimeout(readyTimer);
  }, [text]);

  useEffect(() => {
    if (!isReady || !text || text.length === 0) {
      return;
    }

    let i = 0;
    setDisplayText(''); // Reset display text when starting animation
    
    const typeNextChar = () => {
      if (i < text.length) {
        setDisplayText(prev => prev + text.charAt(i));
        i++;
        setTimeout(typeNextChar, speed);
      }
    };
    
    // Start typing with a small initial delay
    const timer = setTimeout(typeNextChar, speed);

    return () => clearTimeout(timer);
  }, [isReady, text, speed]);

  return displayText;
};
