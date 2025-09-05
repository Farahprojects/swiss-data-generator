/**
 * 🎯 GLOBAL AUDIO CAPTURE MANAGER
 * 
 * Single source of truth for microphone stream and AudioContext.
 * Owns the global audio resources for the entire app session.
 */

export interface AudioCaptureState {
  isActive: boolean;
  stream: MediaStream | null;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  sampleRate: number;
}

export interface AudioCaptureEvents {
  onStateChange?: (state: AudioCaptureState) => void;
  onError?: (error: Error) => void;
}

export class AudioCaptureManager {
  private static instance: AudioCaptureManager | null = null;
  
  private state: AudioCaptureState = {
    isActive: false,
    stream: null,
    audioContext: null,
    analyser: null,
    sampleRate: 0
  };

  private events: AudioCaptureEvents = {};
  private listeners: Set<(state: AudioCaptureState) => void> = new Set();

  private constructor() {}

  static getInstance(): AudioCaptureManager {
    if (!AudioCaptureManager.instance) {
      AudioCaptureManager.instance = new AudioCaptureManager();
    }
    return AudioCaptureManager.instance;
  }

  /**
   * INITIALIZE - Set up global audio capture
   */
  async initialize(): Promise<void> {
    if (this.state.isActive) {
      return;
    }

    try {
      // Get microphone stream
      this.state.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });

      // Create AudioContext
      this.state.audioContext = new AudioContext({
        sampleRate: 48000
      });

      // Create analyser for VAD and visualization
      this.state.analyser = this.state.audioContext.createAnalyser();
      this.state.analyser.fftSize = 2048;
      this.state.analyser.smoothingTimeConstant = 0.8;

      // Connect stream to analyser
      const source = this.state.audioContext.createMediaStreamSource(this.state.stream);
      source.connect(this.state.analyser);

      this.state.sampleRate = this.state.audioContext.sampleRate;
      this.state.isActive = true;

      this.notifyListeners();
      this.events.onStateChange?.(this.state);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to initialize audio capture');
      this.events.onError?.(err);
      throw err;
    }
  }

  /**
   * GET STREAM - Get the current MediaStream
   */
  getStream(): MediaStream | null {
    return this.state.stream;
  }

  /**
   * GET AUDIO CONTEXT - Get the current AudioContext
   */
  getAudioContext(): AudioContext | null {
    return this.state.audioContext;
  }

  /**
   * GET ANALYSER - Get the current AnalyserNode
   */
  getAnalyser(): AnalyserNode | null {
    return this.state.analyser;
  }

  /**
   * GET STATE - Get current capture state
   */
  getState(): Readonly<AudioCaptureState> {
    return { ...this.state };
  }

  /**
   * SUBSCRIBE - Subscribe to state changes
   */
  subscribe(listener: (state: AudioCaptureState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * SET EVENTS - Set event handlers
   */
  setEvents(events: AudioCaptureEvents): void {
    this.events = { ...this.events, ...events };
  }

  /**
   * CLEANUP - Clean up all resources
   */
  async cleanup(): Promise<void> {
    if (!this.state.isActive) {
      return;
    }

    // Stop all tracks
    if (this.state.stream) {
      this.state.stream.getTracks().forEach(track => track.stop());
    }

    // Close AudioContext
    if (this.state.audioContext && this.state.audioContext.state !== 'closed') {
      await this.state.audioContext.close();
    }

    // Reset state
    this.state = {
      isActive: false,
      stream: null,
      audioContext: null,
      analyser: null,
      sampleRate: 0
    };

    this.notifyListeners();
    this.events.onStateChange?.(this.state);
  }

  /**
   * NOTIFY LISTENERS - Notify all subscribers
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('[AudioCaptureManager] Listener error:', error);
      }
    });
  }
}
