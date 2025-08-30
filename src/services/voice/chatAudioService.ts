// src/services/voice/chatAudioService.ts
/**
 * Service to track played audio URLs and prevent duplicate playback
 * from multiple sources (HTTP response vs WebSocket)
 */
class ChatAudioService {
  private playedUrls = new Set<string>();

  /**
   * Mark an audio URL as played to prevent duplicate playback
   */
  markUrlAsPlayed(audioUrl: string): void {
    this.playedUrls.add(audioUrl);
    console.log('[ChatAudioService] Marked URL as played:', audioUrl);
  }

  /**
   * Check if an audio URL has already been played
   */
  hasBeenPlayed(audioUrl: string): boolean {
    return this.playedUrls.has(audioUrl);
  }

  /**
   * Clear all played URLs (e.g., when starting a new conversation)
   */
  clearPlayedUrls(): void {
    this.playedUrls.clear();
    console.log('[ChatAudioService] Cleared all played URLs');
  }
}

export const chatAudioService = new ChatAudioService();