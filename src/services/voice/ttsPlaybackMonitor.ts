/**
 * TTS Playback Monitor - Real-time audio level tracking for AI speaking
 * Now uses the centralized ttsAudio system - no more node creation!
 */

import { getCurrentAudioLevel } from './ttsAudio';

class TtsPlaybackMonitor {
  /**
   * Get current audio level (0-1) - delegates to centralized system
   */
  getCurrentAudioLevel(): number {
    return getCurrentAudioLevel();
  }

  /**
   * Legacy method for backward compatibility - now a no-op
   * The centralized ttsAudio system handles all attachment automatically
   */
  attachToAudio(audioElement: HTMLAudioElement): void {
    console.log('[TtsPlaybackMonitor] Using centralized audio system - no attachment needed');
  }

  /**
   * Legacy method for backward compatibility - now a no-op
   * The centralized ttsAudio system handles all cleanup automatically
   */
  cleanup(): void {
    console.log('[TtsPlaybackMonitor] Using centralized audio system - no manual cleanup needed');
  }
}

export const ttsPlaybackMonitor = new TtsPlaybackMonitor();
