/**
 * Hook to get real-time audio level from conversation microphone service
 * for visual feedback in the conversation overlay
 */

import { useState, useEffect } from 'react';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
export const useConversationAudioLevel = (enabled: boolean = true) => {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    let timeoutId: number | null = null;

    const updateAudioLevel = () => {
      if (!enabled) return; // Skip updates when disabled

      // Get audio level from microphone service (for listening state only)
      const micLevel = conversationMicrophoneService.getCurrentAudioLevel();
      
      // TTS animation is now handled by real-time browser analysis
      setAudioLevel(micLevel);
      
      // 25fps = 40ms intervals
      timeoutId = window.setTimeout(updateAudioLevel, 40);
    };

    if (enabled) {
      updateAudioLevel();
    } else {
      // If disabled, reset to 0 and ensure timeout is not running
      setAudioLevel(0);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  }, [enabled]);

  return audioLevel;
};
