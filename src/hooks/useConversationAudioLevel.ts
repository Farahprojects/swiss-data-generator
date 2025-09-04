/**
 * Hook to get real-time audio level from conversation microphone service
 * for visual feedback in the conversation overlay
 */

import { useState, useEffect } from 'react';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { directAudioAnimationService } from '@/services/voice/DirectAudioAnimationService';

export const useConversationAudioLevel = (enabled: boolean = true) => {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    let animationFrame: number | null = null;

    const updateAudioLevel = () => {
      if (!enabled) return; // Skip updates when disabled

      // Get audio level from microphone service (for listening state)
      const micLevel = conversationMicrophoneService.getCurrentAudioLevel();
      
      // Get current TTS audio level from the service
      const ttsLevel = directAudioAnimationService.getCurrentLevel();
      
      // Use the higher of the two levels
      const level = Math.max(micLevel, ttsLevel);
      
      // Debug logging
      if (micLevel > 0.01) {
        console.log(`[useConversationAudioLevel] 🎤 Mic level: ${micLevel.toFixed(4)}, TTS level: ${ttsLevel.toFixed(4)}, Final: ${level.toFixed(4)}`);
      }
      
      setAudioLevel(level);
      
      animationFrame = requestAnimationFrame(updateAudioLevel);
    };

    if (enabled) {
      updateAudioLevel();
    } else {
      // If disabled, reset to 0 and ensure RAF is not running
      setAudioLevel(0);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    };
  }, [enabled]);

  return audioLevel;
};
