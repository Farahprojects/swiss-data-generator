import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { SpeakingBarsOptimized } from './SpeakingBarsOptimized';
import TorusListening from './TorusListening';

interface Props {
  state: 'listening' | 'processing' | 'replying' | 'connecting' | 'thinking' | 'establishing';
  audioLevel?: number;
}

export const VoiceBubble: React.FC<Props> = ({ state, audioLevel = 0 }) => {
  // Show the appropriate component based on the current state
  if (state === 'replying') {
    return <SpeakingBarsOptimized isActive={true} />;
  }
  
  if (state === 'processing' || state === 'thinking') {
    // Render the TorusListening component in its 'thinking' state
    return <TorusListening active={true} size={128} isThinking={true} />;
  }

  if (state === 'listening') {
    // Render the TorusListening component in its 'listening' state
    return <TorusListening active={true} size={128} isThinking={false} audioLevel={audioLevel} />;
  }

  if (state === 'establishing') {
    // Render establishing animation with spinning border
    return (
      <motion.div
        className="flex items-center justify-center rounded-full w-24 h-24 md:w-32 md:h-32 shadow-lg bg-white"
        style={{ transformOrigin: 'center' }}
      >
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-gray-900"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <div className="relative z-10 flex items-center justify-center">
          <Mic className="w-8 h-8 md:w-10 md:h-10 text-gray-900" />
        </div>
      </motion.div>
    );
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
