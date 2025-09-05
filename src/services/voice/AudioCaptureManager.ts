import { CHAT_EVENTS } from '@/core/events';
import { eventBus } from '@/core/eventBus';
import { chatTextMicrophoneService } from '@/services/microphone/ChatTextMicrophoneService';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { ttsPlaybackService } from '@/services/voice/TTSPlaybackService';

/**
 * Centralized authority to deterministically stop/cleanup audio capture chains.
 * Not driven by React props/state; reacts to domain events instead.
 */
class AudioCaptureManagerClass {
  private abortController: AbortController | null = null;
  private initialized = false;

  initializeOnce(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Recording lifecycle
    eventBus.on(CHAT_EVENTS.RECORDING_STOP, () => this.abortAndCleanup('recording_stop'));
    eventBus.on(CHAT_EVENTS.RECORDING_CANCEL, () => this.abortAndCleanup('recording_cancel'));

    // STT
    eventBus.on(CHAT_EVENTS.STT_COMPLETE, () => this.abortAndCleanup('stt_complete'));
    eventBus.on(CHAT_EVENTS.STT_ERROR, () => this.abortAndCleanup('stt_error'));

    // TTS
    eventBus.on(CHAT_EVENTS.TTS_AUDIO_PLAYING, () => this.pauseCaptureForPlayback());
    eventBus.on(CHAT_EVENTS.TTS_AUDIO_ENDED, () => this.resumeCaptureAfterPlayback());

    // Conversation cleared
    eventBus.on(CHAT_EVENTS.CONVERSATION_CLEAR, () => this.abortAndCleanup('conversation_clear'));
  }

  startTurn(): void {
    this.abortController = new AbortController();
  }

  private async pauseCaptureForPlayback(): Promise<void> {
    try { conversationMicrophoneService.suspendForPlayback(); } catch {}
  }

  private async resumeCaptureAfterPlayback(): Promise<void> {
    try { await conversationMicrophoneService.resumeAfterPlayback(); } catch {}
  }

  private async abortAndCleanup(reason: string): Promise<void> {
    try { this.abortController?.abort(); } catch {}
    this.abortController = null;

    // Stop TTS playback context and animation
    try { await ttsPlaybackService.destroy(); } catch {}

    // Cleanup mic domains
    try { await conversationMicrophoneService.cancelRecording?.(); } catch {}
    try { await conversationMicrophoneService.cleanup(); } catch {}

    try { await chatTextMicrophoneService.forceCleanup(); } catch {}
  }
}

export const AudioCaptureManager = new AudioCaptureManagerClass();


