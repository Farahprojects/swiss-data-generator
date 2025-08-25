import React from 'react';
import { motion } from 'framer-motion';
import { SpeakingBars } from './SpeakingBars';
import { ThinkingCloud } from './ThinkingCloud';
import { useTtsStreamLevel } from '@/hooks/useTtsStreamLevel';
import ToraListening from './ToraListening';

interface Props {
  state: 'listening' | 'processing' | 'replying' | 'connecting';
  audioLevel?: number;
}

export const VoiceBubble: React.FC<Props> = ({ state, audioLevel = 0 }) => {
  const ttsAudioLevel = useTtsStreamLevel();

  // Show speaking bars for replying state, thinking cloud for processing, bubble for others
  if (state === 'replying') {
    return <SpeakingBars audioLevel={ttsAudioLevel} />;
  }
  
  if (state === 'processing') {
    return <ThinkingCloud />;
  }

  if (state === 'listening') {
    return <ToraListening audioLevel={audioLevel} />;
  }

  // Bubble base for connecting (fallback)
  const baseClass = 'flex items-center justify-center rounded-full w-24 h-24 md:w-32 md:h-32 shadow-lg';

  const styles: Record<'listening' | 'processing' | 'replying' | 'connecting', string> = {
    listening: 'bg-black shadow-gray-800/50',
    processing: 'bg-black shadow-gray-800/50',
    replying: 'bg-black shadow-gray-800/50',
    connecting: 'bg-gray-500 shadow-gray-600/50',
  };

  return (
    <motion.div
      className={`${baseClass} ${styles[state]}`}
      style={{ transformOrigin: 'center' }}
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ repeat: Infinity, duration: 1.0 }}
    />
  );
};
