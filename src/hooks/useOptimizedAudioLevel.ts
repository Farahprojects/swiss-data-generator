// ✅ DEPRECATED: This hook is no longer needed
// The new envelope-driven system provides audio levels directly through services

import { useState } from 'react';

export const useOptimizedAudioLevel = () => {
  // ✅ Return static 0 - envelope system handles audio levels directly
  return 0;
};

// Hook for conversation state management (high-level only)
export const useConversationState = () => {
  const [state, setState] = useState<'idle' | 'listening' | 'speaking' | 'thinking'>('idle');
  
  // Only update state when conversation mode changes
  const updateState = (newState: typeof state) => {
    if (newState !== state) {
      setState(newState);
    }
  };

  return { state, updateState };
};
