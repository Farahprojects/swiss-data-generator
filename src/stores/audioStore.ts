import { create } from 'zustand';

interface AudioState {
  audioContext: AudioContext | null;
  isAudioUnlocked: boolean;
  setAudioUnlocked: (val: boolean) => void;
  initializeAudioContext: () => AudioContext;
  resumeAudioContext: () => Promise<boolean>;
  unlockOutput: () => Promise<boolean>;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  audioContext: null,
  isAudioUnlocked: false,
  
  setAudioUnlocked: (val: boolean) => set({ isAudioUnlocked: val }),
  
  initializeAudioContext: () => {
    const { audioContext } = get();
    if (audioContext) return audioContext;
    
    const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    set({ audioContext: newAudioContext });
    return newAudioContext;
  },
  
  resumeAudioContext: async () => {
    const { audioContext } = get();
    if (!audioContext) return false;
    
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
        set({ isAudioUnlocked: true });
        return true;
      } catch (error) {
        return false;
      }
    } else {
      set({ isAudioUnlocked: true });
      return true;
    }
  },
  
  // Play a short silent buffer (~100ms) to unlock output on all browsers (esp. Safari/iOS)
  unlockOutput: async () => {
    const { audioContext } = get();
    if (!audioContext) return false;
    try {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const sampleRate = 48000;
      const durationSec = 0.1; // 100ms
      const frameCount = Math.max(1, Math.floor(sampleRate * durationSec));
      const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) channel[i] = 0;
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
      source.stop(audioContext.currentTime + durationSec);
      set({ isAudioUnlocked: true });
      return true;
    } catch {
      return false;
    }
  }
}));
