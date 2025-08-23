// src/hooks/useTtsStreamLevel.ts
import { useState, useEffect } from 'react';
import { conversationTtsService } from '@/services/voice/conversationTts';

export const useTtsStreamLevel = () => {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      setAudioLevel(conversationTtsService.getCurrentAudioLevel());
      animationFrameId = requestAnimationFrame(update);
    };

    const unsubscribe = conversationTtsService.subscribe(() => {
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(update);
      }
    });

    return () => {
      unsubscribe();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return audioLevel;
};
