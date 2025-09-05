import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { chatTextMicrophoneService } from '@/services/microphone/ChatTextMicrophoneService';

class AudioCaptureManager {
  // One-shot cleanup for all capture domains
  public audioCleanup(): void {
    console.log('🔴 [MICROPHONE-KILLER] AudioCaptureManager.audioCleanup() called - WHO IS KILLING THE MIC?');
    try { conversationMicrophoneService.forceCleanup(); } catch {}
    try { chatTextMicrophoneService.forceCleanup(); } catch {}
  }
}

export const audioCaptureManager = new AudioCaptureManager();


