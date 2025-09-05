import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { chatTextMicrophoneService } from '@/services/microphone/ChatTextMicrophoneService';

class AudioCaptureManager {
  // One-shot cleanup for all capture domains
  public audioCleanup(): void {
    try { conversationMicrophoneService.forceCleanup(); } catch {}
    try { chatTextMicrophoneService.forceCleanup(); } catch {}
  }
}

export const audioCaptureManager = new AudioCaptureManager();


