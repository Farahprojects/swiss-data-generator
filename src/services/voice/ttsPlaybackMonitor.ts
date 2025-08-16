/**
 * TTS Playback Monitor - Real-time audio level tracking for AI speaking
 * Attaches to audio elements to provide visual feedback during TTS playback
 */

import { attachToAudio as attachToAudioContext, getGlobalAudioContext } from '@/utils/audioContextUtils';

class TtsPlaybackMonitor {
  private currentAudioLevel = 0;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrame: number | null = null;
  private isMonitoring = false;

  /**
   * Get or create a reliable AudioContext - using global context for 90% flakiness fix
   */
  private getAudioContext(): AudioContext {
    const globalCtx = getGlobalAudioContext();
    if (globalCtx) {
      this.audioContext = globalCtx;
      return globalCtx;
    }
    
    if (!this.audioContext || this.audioContext.state === "closed") {
      this.audioContext = new AudioContext();
      console.log('[TtsPlaybackMonitor] Created new AudioContext, state:', this.audioContext.state);
    }
    return this.audioContext;
  }

  /**
   * Attach monitor to an audio element and start tracking levels - BULLETPROOF VERSION with 90% flakiness fix
   */
  async attachToAudio(audioElement: HTMLAudioElement): Promise<void> {
    if (!audioElement) {
      throw new Error('[TtsPlaybackMonitor] No audio element provided');
    }

    try {
      // First, use the global AudioContext fix for basic audio playback
      await attachToAudioContext(audioElement);
      console.log('[TtsPlaybackMonitor] Applied global AudioContext fix');

      const ctx = this.getAudioContext();
      
      // Create analyser if needed for monitoring
      if (!this.analyser) {
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        console.log('[TtsPlaybackMonitor] Created new analyser node');
      }

      // Get the source node created by the global fix
      const src: AudioNode = (audioElement as any)._srcNode;

      // Runtime type checks - SAFETY GUARDS
      if (!(src instanceof AudioNode)) {
        throw new Error('[TtsPlaybackMonitor] Source is not an AudioNode');
      }

      // Connect to analyser for monitoring (but don't interfere with destination connection)
      if (!(audioElement as any)._analyserConnected) {
        console.log('[TtsPlaybackMonitor] Connecting to analyser for monitoring...');
        // Disconnect from destination first, then reconnect through analyser
        src.disconnect();
        src.connect(this.analyser);
        this.analyser.connect(ctx.destination);
        (audioElement as any)._analyserConnected = true;
        console.log('[TtsPlaybackMonitor] Analyser connected for monitoring');
      } else {
        console.log('[TtsPlaybackMonitor] Analyser already connected, skipping');
      }

      // Start monitoring
      this.isMonitoring = true;
      this.updateAudioLevel();
      
      console.log('[TtsPlaybackMonitor] Successfully attached to audio element with global fix', {
        audioElementId: (audioElement as any).id || 'no-id',
        audioElementSrc: audioElement.src.substring(0, 50) + '...',
        audioContextState: ctx.state,
        sourceNodeReused: !!(audioElement as any)._srcNode,
        connectionsReused: !!(audioElement as any)._connected,
        analyserConnected: !!(audioElement as any)._analyserConnected
      });
    } catch (error) {
      console.error('[TtsPlaybackMonitor] Failed to attach to audio:', error);
      console.error('[TtsPlaybackMonitor] AudioContext state:', this.audioContext?.state);
      console.error('[TtsPlaybackMonitor] Audio element state:', {
        src: audioElement.src,
        readyState: audioElement.readyState,
        networkState: audioElement.networkState
      });
      throw error;
    }
  }

  /**
   * Get current audio level (0-1)
   */
  getCurrentAudioLevel(): number {
    return this.currentAudioLevel;
  }

  /**
   * Internal method to continuously update audio levels
   */
  private updateAudioLevel = (): void => {
    if (!this.isMonitoring || !this.analyser || !this.dataArray) {
      return;
    }

    // Get frequency data
    if (this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);
    }

    // Calculate RMS (root mean square) for audio level
    let sum = 0;
    const arrayLength = this.dataArray.length;
    for (let i = 0; i < arrayLength; i++) {
      const value = this.dataArray[i];
      sum += value * value;
    }
    const rms = Math.sqrt(sum / arrayLength);
    
    // Normalize to 0-1 range (255 is max value)
    this.currentAudioLevel = rms / 255;

    // Continue monitoring
    this.animationFrame = requestAnimationFrame(this.updateAudioLevel);
  };

  /**
   * Stop monitoring and cleanup resources
   */
  cleanup(): void {
    this.isMonitoring = false;
    this.currentAudioLevel = 0;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Keep audio context for reuse, just disconnect
    this.analyser = null;
    this.dataArray = null;
    
    console.log('[TtsPlaybackMonitor] Cleanup complete');
  }

  /**
   * Disconnect and clean up audio element connections for hot-swapping
   */
  disconnectAudio(audioElement: HTMLAudioElement): void {
    if (!audioElement) return;

    try {
      const srcNode = (audioElement as any)._srcNode;
      if (srcNode) {
        srcNode.disconnect();
        console.log('[TtsPlaybackMonitor] Disconnected audio element source node');
      }
      
      // Clear flags so new connections can be made
      (audioElement as any)._srcNode = null;
      (audioElement as any)._connected = false;
      (audioElement as any)._analyserConnected = false;
      
      console.log('[TtsPlaybackMonitor] Audio element cleaned up for reuse');
    } catch (error) {
      console.error('[TtsPlaybackMonitor] Error disconnecting audio element:', error);
    }
  }
}

export const ttsPlaybackMonitor = new TtsPlaybackMonitor();
