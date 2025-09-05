/**
 * Audio Arbitrator - Ensures only one audio system runs at a time
 * Prevents conflicts between microphone and TTS playback
 */

type AudioSystem = 'microphone' | 'tts' | 'none';

class AudioArbitrator {
  private currentSystem: AudioSystem = 'none';
  private listeners = new Set<(system: AudioSystem) => void>();

  /**
   * Request to take control of audio system
   * Returns true if successful, false if another system is active
   */
  requestControl(system: AudioSystem): boolean {
    if (this.currentSystem === 'none' || this.currentSystem === system) {
      this.currentSystem = system;
      this.notifyListeners();
      console.log(`🎵 [AudioArbitrator] ${system.toUpperCase()} took control`);
      return true;
    }

    // 🚨 BIG RED CONSOLE LOG for conflicts
    console.error(
      `🚨🚨🚨 AUDIO CONFLICT DETECTED 🚨🚨🚨\n` +
      `Current system: ${this.currentSystem.toUpperCase()}\n` +
      `Requested system: ${system.toUpperCase()}\n` +
      `ONLY ONE AUDIO SYSTEM CAN RUN AT A TIME!\n` +
      `🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨`
    );
    return false;
  }

  /**
   * Release control of audio system
   */
  releaseControl(system: AudioSystem): void {
    if (this.currentSystem === system) {
      this.currentSystem = 'none';
      this.notifyListeners();
      console.log(`🎵 [AudioArbitrator] ${system.toUpperCase()} released control`);
    }
  }

  /**
   * Get current active system
   */
  getCurrentSystem(): AudioSystem {
    return this.currentSystem;
  }

  /**
   * Check if a system can take control
   */
  canTakeControl(system: AudioSystem): boolean {
    return this.currentSystem === 'none' || this.currentSystem === system;
  }

  /**
   * Force release all systems (emergency cleanup)
   */
  forceReleaseAll(): void {
    console.warn('🚨 [AudioArbitrator] Force releasing all audio systems');
    this.currentSystem = 'none';
    this.notifyListeners();
  }

  /**
   * Subscribe to system changes
   */
  subscribe(listener: (system: AudioSystem) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentSystem));
  }
}

export const audioArbitrator = new AudioArbitrator();
