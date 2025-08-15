/**
 * Hook to get real-time audio level from conversation microphone service
 * for visual feedback in the conversation overlay
 */

import { useState, useEffect } from 'react';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';

export const useConversationAudioLevel = () => {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    let animationFrame: number;

    const updateAudioLevel = () => {
      const level = conversationMicrophoneService.getCurrentAudioLevel();
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
