import { create } from 'zustand';

interface AudioState {
  audioContext: AudioContext | null;
  isAudioUnlocked: boolean;
  setAudioUnlocked: (val: boolean) => void;
  initializeAudioContext: () => AudioContext;
  resumeAudioContext: () => Promise<boolean>;
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
        console.log('[AudioStore] ✅ AudioContext resumed via user gesture!');
        set({ isAudioUnlocked: true });
        return true;
      } catch (error) {
        console.error('[AudioStore] ❌ Failed to resume AudioContext:', error);
        return false;
      }
    } else {
      set({ isAudioUnlocked: true });
      return true;
    }
  }
}));
