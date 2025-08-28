// src/hooks/useTtsStreamLevel.ts
import { useState, useEffect } from 'react';
import { conversationTtsService } from '@/services/voice/conversationTts';

export const useTtsStreamLevel = () => {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    // Subscribe to the TTS service for real-time audio level updates
    const unsubscribe = conversationTtsService.subscribe(() => {
      setAudioLevel(conversationTtsService.getCurrentAudioLevel());
    });

    // Initial level
    setAudioLevel(conversationTtsService.getCurrentAudioLevel());

    return () => {
      unsubscribe();
    };
  }, []);

  return audioLevel;
};
