// src/hooks/useTtsStreamLevel.ts
import { useState, useEffect } from 'react';
import { conversationTtsService } from '@/services/voice/conversationTts';

export const useTtsStreamLevel = () => {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    // Subscribe to TTS service notifications for real-time audio level updates
    const unsubscribe = conversationTtsService.subscribe(() => {
      setAudioLevel(conversationTtsService.getCurrentAudioLevel());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return audioLevel;
};
