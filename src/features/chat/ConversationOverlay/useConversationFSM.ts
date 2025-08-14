import { useState, useEffect } from 'react';

type ConversationState = 'listening' | 'processing' | 'replying';

export const useConversationFSM = () => {
  const [state, setState] = useState<ConversationState>('listening');

  /**
   * Transition helpers – for now they simply change state, but we can wire
   * actual STT/LLM/TTS promises later.
   */
  const toProcessing = () => setState('processing');
  const toReplying = () => setState('replying');
  const toListening = () => setState('listening');

  // Demo effect: auto-cycle through states for now (will be replaced)
  useEffect(() => {
    if (state === 'listening') return;
    const id = setTimeout(() => setState('listening'), 2500);
    return () => clearTimeout(id);
  }, [state]);

  return { state, toProcessing, toReplying, toListening };
};
