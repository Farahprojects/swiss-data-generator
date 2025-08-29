import React from 'react';
import { motion } from 'framer-motion';
import { SpeakingBars } from './SpeakingBars';
import { useTtsStreamLevel } from '@/hooks/useTtsStreamLevel';
import TorusListening from './TorusListening';

interface Props {
  state: 'listening' | 'processing' | 'replying' | 'connecting' | 'thinking' | 'establishing';
  audioLevel?: number;
}

export const VoiceBubble: React.FC<Props> = ({ state, audioLevel = 0 }) => {
  const ttsAudioLevel = useTtsStreamLevel();

  // Show the appropriate component based on the current state
  if (state === 'replying') {
    return <SpeakingBars audioLevel={ttsAudioLevel} />;
  }
  
  if (state === 'processing' || state === 'thinking') {
    // Render the TorusListening component in its 'thinking' state
    return <TorusListening active={true} size={128} isThinking={true} />;
  }

  if (state === 'establishing') {
    // Connection animation with spinning border
    return (
      <div className="relative flex items-center justify-center">
        <motion.div
          className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-100 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, ease: "linear", repeat: 1 }}
        >
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-white flex items-center justify-center">
            <motion.div
              className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-gray-300"
              animate={{ 
                borderColor: ['#d1d5db', '#3b82f6', '#d1d5db'],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 1, 
                ease: "easeInOut",
                repeat: 1,
                repeatType: "reverse"
              }}
            >
              <div className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
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
