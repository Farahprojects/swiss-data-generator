/**
 * Hook to get real-time audio level from conversation microphone service
 * for visual feedback in the conversation overlay
 */

import { useState, useEffect } from 'react';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { directAudioAnimationService } from '@/services/voice/DirectAudioAnimationService';

export const useConversationAudioLevel = () => {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    let animationFrame: number;

    const updateAudioLevel = () => {
      // Get audio level from microphone service (for listening state)
      const micLevel = conversationMicrophoneService.getCurrentAudioLevel();
      
      // Get current TTS audio level from the service
      const ttsLevel = directAudioAnimationService.getCurrentLevel();
      
      // Use the higher of the two levels
      const level = Math.max(micLevel, ttsLevel);
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
