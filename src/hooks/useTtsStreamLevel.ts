// src/hooks/useTtsStreamLevel.ts
import { useState, useEffect } from 'react';
import { streamPlayerService } from '@/services/voice/StreamPlayerService';

export const useTtsStreamLevel = () => {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      setAudioLevel(streamPlayerService.getCurrentAudioLevel());
      animationFrameId = requestAnimationFrame(update);
    };

    const unsubscribe = streamPlayerService.subscribe(() => {
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
