import { directBarsAnimationService, FourBarLevels } from '@/services/voice/DirectBarsAnimationService';
import { audioArbitrator } from '@/services/audio/AudioArbitrator';

class TTSPlaybackService {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private animationTimer: number | null = null;
  private isPlaying = false;
  private isPaused = false;
  private listeners = new Set<() => void>();

  private notify() {
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState() {
    return { isPlaying: this.isPlaying, isPaused: this.isPaused };
  }

  private ensureAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ latencyHint: 'playback' });
      } catch {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Tie animation pause/resume to playback context
      this.audioContext.onstatechange = () => {
        if (!this.audioContext) return;
        const state = this.audioContext.state;
        if (state === 'suspended') {
          this.isPaused = true;
          directBarsAnimationService.pause();
        } else if (state === 'running') {
          this.isPaused = false;
          directBarsAnimationService.resume();
        }
        this.notify();
      };
    }
    return this.audioContext;
  }

  private startAnimation(analyser: AnalyserNode) {
    directBarsAnimationService.start();
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const step = () => {
      if (!this.currentSource) {
        this.animationTimer = null;
        return;
      }
      analyser.getByteFrequencyData(frequencyData);
      let total = 0;
      for (let i = 0; i < frequencyData.length; i++) total += frequencyData[i];
      const raw = total / (frequencyData.length * 255);
      const overall = Math.min(1, Math.max(0.2, raw * 0.8 + 0.2));
      const levels: FourBarLevels = [overall, overall, overall, overall];
      directBarsAnimationService.notifyBars(levels);
      this.animationTimer = window.setTimeout(step, 40);
    };
    this.animationTimer = window.setTimeout(step, 40);
  }

  private stopAnimation() {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
    directBarsAnimationService.stop();
  }

  private async decodeToBuffer(audioBytes: number[]): Promise<AudioBuffer> {
    const ctx = this.ensureAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const arrayBuffer = new Uint8Array(audioBytes).buffer;
    return await ctx.decodeAudioData(arrayBuffer);
  }

  async play(audioBytes: number[], onEnded?: () => void): Promise<void> {
    try {
      // 🎵 REQUEST AUDIO CONTROL - Ensure no conflicts
      if (!audioArbitrator.requestControl('tts')) {
        throw new Error('Cannot start TTS playback - microphone is active');
      }

      const ctx = this.ensureAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      // Teardown existing (without releasing control)
      this.internalStop();

      const buffer = await this.decodeToBuffer(audioBytes);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      this.currentSource = source;
      this.analyser = analyser;
      this.isPlaying = true;
      this.isPaused = false;
      this.notify();

      this.startAnimation(analyser);

      source.onended = () => {
        this.stopAnimation();
        this.currentSource = null;
        this.analyser = null;
        this.isPlaying = false;
        this.isPaused = false;
        
        // 🎵 RELEASE AUDIO CONTROL when TTS finishes
        audioArbitrator.releaseControl('tts');
        
        this.notify();
        if (onEnded) onEnded();
      };

      source.start(0);
    } catch (e) {
      this.internalStop();
      // 🎵 RELEASE CONTROL on error
      audioArbitrator.releaseControl('tts');
      throw e;
    }
  }

  pause(): void {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  private internalStop(): void {
    if (this.currentSource) {
      try { this.currentSource.stop(0); } catch {}
      this.currentSource.disconnect();
    }
    this.currentSource = null;
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch {}
    }
    this.analyser = null;
    this.stopAnimation();
    this.isPlaying = false;
    this.isPaused = false;
    this.notify();
  }

  stop(): void {
    this.internalStop();
    // 🎵 RELEASE AUDIO CONTROL when manually stopped
    audioArbitrator.releaseControl('tts');
  }

  async destroy(): Promise<void> {
    this.internalStop();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { await this.audioContext.close(); } catch {}
    }
    this.audioContext = null;
    this.listeners.clear();
    
    // 🎵 RELEASE AUDIO CONTROL on destroy
    audioArbitrator.releaseControl('tts');
  }
}

export const ttsPlaybackService = new TTSPlaybackService();


