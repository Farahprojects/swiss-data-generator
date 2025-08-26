import React from 'react';
import { motion } from 'framer-motion';
import { SpeakingBars } from './SpeakingBars';
import { useTtsStreamLevel } from '@/hooks/useTtsStreamLevel';
import TorusListening from './TorusListening';

interface Props {
  state: 'listening' | 'processing' | 'replying' | 'connecting';
  audioLevel?: number;
}

export const VoiceBubble: React.FC<Props> = ({ state, audioLevel = 0 }) => {
  const ttsAudioLevel = useTtsStreamLevel();

  // Show the appropriate component based on the current state
  if (state === 'replying') {
    return <SpeakingBars audioLevel={ttsAudioLevel} />;
  }
  
  if (state === 'processing') {
    // Render the TorusListening component in its 'thinking' state
    return <TorusListening active={true} size={128} isThinking={true} />;
  }

  if (state === 'listening') {
    // Render the TorusListening component in its 'listening' state
    return <TorusListening active={true} size={128} isThinking={false} audioLevel={audioLevel} />;
  }

  // Fallback for 'connecting' state or any other undefined states
  const baseClass = 'flex items-center justify-center rounded-full w-24 h-24 md:w-32 md:h-32 shadow-lg';
  const connectingClass = 'bg-gray-500 shadow-gray-600/50';

  return (
    <motion.div
      className={`${baseClass} ${connectingClass}`}
      style={{ transformOrigin: 'center' }}
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ repeat: Infinity, duration: 1.0 }}
    />
  );
};
