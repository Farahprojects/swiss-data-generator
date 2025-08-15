/**
 * 🔍 DEBUG AUDIO CONTEXT - Simple in-memory debug audio sharing
 * 
 * Lightweight context for passing failed audio blobs to the conversation modal
 * for immediate playback and debugging.
 */

import React, { createContext, useContext, useState } from 'react';

interface DebugAudioData {
  blob: Blob;
  reason: string;
  metadata?: Record<string, any>;
}

interface DebugAudioContextType {
  debugAudio: DebugAudioData | null;
  setDebugAudio: (audio: DebugAudioData | null) => void;
  clearDebugAudio: () => void;
}

const DebugAudioContext = createContext<DebugAudioContextType | undefined>(undefined);

export const DebugAudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [debugAudio, setDebugAudio] = useState<DebugAudioData | null>(null);

  const clearDebugAudio = () => setDebugAudio(null);

  return (
    <DebugAudioContext.Provider value={{
      debugAudio,
      setDebugAudio,
      clearDebugAudio
    }}>
      {children}
    </DebugAudioContext.Provider>
  );
};

export const useDebugAudio = () => {
  const context = useContext(DebugAudioContext);
  if (context === undefined) {
    throw new Error('useDebugAudio must be used within a DebugAudioProvider');
  }
  return context;
};
