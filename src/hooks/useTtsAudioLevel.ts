/**
 * Hook to get real-time audio level from TTS playback
 * for visual feedback during AI speaking
 */

import { useState, useEffect } from 'react';
import { ttsPlaybackMonitor } from '@/services/voice/ttsPlaybackMonitor';

export const useTtsAudioLevel = () => {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    let animationFrame: number;

    const updateAudioLevel = () => {
      const level = ttsPlaybackMonitor.getCurrentAudioLevel();
      setAudioLevel(level);
      animationFrame = requestAnimationFrame(updateAudioLevel);
    };

    // Start monitoring when component mounts
    updateAudioLevel();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return audioLevel;
};