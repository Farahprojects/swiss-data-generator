import { useState, useEffect } from 'react';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';

interface WordAnimationResult {
  animatedText: string;
  isAnimating: boolean;
}

/**
 * Hook that animates text by revealing 2-3 words at a time
 * Used for streaming message animation effect like ChatGPT
 * 
 * @param text - Complete message text to animate
 * @param initialDelay - Optional initial delay before starting animation (ms)
 * @returns Object with animatedText and isAnimating flag
 */
export function useWordAnimation(text: string, initialDelay?: number): WordAnimationResult {
  const [displayedText, setDisplayedText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const isConversationOpen = useConversationUIStore((state) => state.isConversationOpen);

  useEffect(() => {
    // Skip animation if Conversation Mode is open or no text
    if (!text || isConversationOpen) {
      setDisplayedText(text);
      setIsAnimating(false);
      return;
    }

    // Split text into tokens (words + whitespace) to preserve formatting
    const tokens: string[] = [];
    const regex = /(\S+|\s+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      tokens.push(match[0]);
    }
    
    const totalTokens = tokens.length;
    let currentTokenIndex = 0;

    // Clear previous content
    setDisplayedText('');
    setIsAnimating(true);

    // Start animation after optional initial delay
    const startAnimationDelay = setTimeout(() => {
      // Animation interval - reveal 2-3 words every 100ms
      const interval = setInterval(() => {
        if (currentTokenIndex >= totalTokens) {
          clearInterval(interval);
          setIsAnimating(false);
          return;
        }

        // Count word tokens to reveal (skip whitespace in count)
        let wordsRevealed = 0;
        const wordsToReveal = Math.floor(Math.random() * 2) + 2; // Random 2 or 3
        let endIndex = currentTokenIndex;
        
        while (endIndex < totalTokens && wordsRevealed < wordsToReveal) {
          if (tokens[endIndex].trim().length > 0) {
            wordsRevealed++;
          }
          endIndex++;
        }
        
        // Build the displayed text up to this point (preserves all formatting)
        const nextText = tokens.slice(0, endIndex).join('');
        setDisplayedText(nextText);

        currentTokenIndex = endIndex;
      }, 100);

      return () => clearInterval(interval);
    }, initialDelay || 0);

    return () => clearTimeout(startAnimationDelay);
  }, [text, isConversationOpen, initialDelay]);

  return { animatedText: displayedText, isAnimating };
}
