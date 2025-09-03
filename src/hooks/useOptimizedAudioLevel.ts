// Optimized Audio Level Hook
// Uses Web Worker + throttled updates instead of 60fps polling

import { useState, useEffect, useRef } from 'react';
import { audioProcessingService } from '@/services/voice/AudioProcessingService';

export const useOptimizedAudioLevel = () => {
  const [audioLevel, setAudioLevel] = useState(0);
  const lastLevelRef = useRef(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to audio processing service
    const unsubscribe = audioProcessingService.subscribe((level) => {
      // Debug: Log received audio levels
      console.log('[useOptimizedAudioLevel] 🎵 Received audio level:', level.toFixed(3));
      
      // Only update state if level changed significantly (prevents unnecessary re-renders)
      const levelDiff = Math.abs(level - lastLevelRef.current);
      if (levelDiff > 0.05 || level === 0) {
        console.log('[useOptimizedAudioLevel] 🔄 Updating state from', lastLevelRef.current.toFixed(3), 'to', level.toFixed(3));
        setAudioLevel(level);
        lastLevelRef.current = level;
      }
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return audioLevel;
};

// Hook for conversation state management (high-level only)
export const useConversationState = () => {
  const [state, setState] = useState<'idle' | 'listening' | 'speaking' | 'thinking'>('idle');
  
  // Only update state when conversation mode changes
  const updateState = (newState: typeof state) => {
    if (newState !== state) {
      setState(newState);
    }
  };

  return { state, updateState };
};
