// src/hooks/useTtsStreamLevel.ts
import { useState, useEffect } from 'react';
import { conversationTtsService } from '@/services/voice/conversationTts';

export const useTtsStreamLevel = () => {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      const level = conversationTtsService.getCurrentAudioLevel();
      console.log('[useTtsStreamLevel] Current audio level:', level);
      setAudioLevel(level);
      animationFrameId = requestAnimationFrame(update);
    };

    // 🔥 FIXED: Remove subscription to prevent WebSocket leak
    // The TTS service no longer sends notifications, so we just poll directly
    animationFrameId = requestAnimationFrame(update);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return audioLevel;
};
