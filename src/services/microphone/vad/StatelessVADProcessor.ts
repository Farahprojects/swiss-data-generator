/**
 * 🎯 STATELESS VAD PROCESSOR
 * 
 * Pure, stateless voice activity detection utility.
 * No lifecycle management, no resource ownership.
 * Just processes audio frames and returns events.
 */

export interface VADConfig {
  voiceThreshold?: number;       // RMS threshold for voice detection (default: 0.012)
  silenceThreshold?: number;     // RMS threshold for silence (default: 0.008)
  voiceConfirmMs?: number;       // Duration to confirm voice start (default: 300ms)
  silenceTimeoutMs?: number;     // Silence timeout duration (default: 1500ms)
}

export interface VADState {
  phase: 'waiting_for_voice' | 'monitoring_silence';
  voiceStarted: boolean;
  audioLevel: number;
  voiceStartTime: number | null;
  silenceStartTime: number | null;
}

export interface VADEvents {
  onVoiceStart?: () => void;
  onSilenceDetected?: () => void;
}

export class StatelessVADProcessor {
  private config: Required<VADConfig>;
  private state: VADState;
  private events: VADEvents;

  constructor(config: VADConfig = {}, events: VADEvents = {}) {
    this.config = {
      voiceThreshold: 0.012,
      silenceThreshold: 0.008,
      voiceConfirmMs: 300,
      silenceTimeoutMs: 1500,
      ...config
    };

    this.events = events;
    this.reset();
  }

  /**
   * RESET - Reset to initial state
   */
  reset(): void {
    this.state = {
      phase: 'waiting_for_voice',
      voiceStarted: false,
      audioLevel: 0,
      voiceStartTime: null,
      silenceStartTime: null
    };
  }

  /**
   * PROCESS AUDIO FRAME - Pure function that processes RMS and returns events
   */
  processFrame(rms: number): void {
    this.state.audioLevel = rms;
    const now = Date.now();

    if (this.state.phase === 'waiting_for_voice') {
      // Phase 1: Wait for voice activity
      if (rms > this.config.voiceThreshold) {
        if (this.state.voiceStartTime === null) {
          this.state.voiceStartTime = now;
        } else if (now - this.state.voiceStartTime >= this.config.voiceConfirmMs) {
          // Voice confirmed! Switch to active recording
          this.state.phase = 'monitoring_silence';
          this.state.voiceStarted = true;
          this.state.voiceStartTime = null;
          this.events.onVoiceStart?.();
        }
      } else {
        this.state.voiceStartTime = null;
      }

    } else if (this.state.phase === 'monitoring_silence') {
      // Phase 2: Monitor for silence after voice
      if (rms < this.config.silenceThreshold) {
        if (this.state.silenceStartTime === null) {
          this.state.silenceStartTime = now;
        } else if (now - this.state.silenceStartTime >= this.config.silenceTimeoutMs) {
          // Natural silence detected
          this.events.onSilenceDetected?.();
        }
      } else {
        this.state.silenceStartTime = null;
      }
    }
  }

  /**
   * GET CURRENT STATE - Read-only access to current state
   */
  getState(): Readonly<VADState> {
    return { ...this.state };
  }

  /**
   * UPDATE EVENTS - Change event handlers without resetting state
   */
  updateEvents(events: VADEvents): void {
    this.events = { ...this.events, ...events };
  }
}
