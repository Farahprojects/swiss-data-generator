import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  state: 'listening' | 'processing' | 'replying';
  audioLevel?: number;
}

export const VoiceBubble: React.FC<Props> = ({ state, audioLevel = 0 }) => {
  // Smaller, more elegant bubble
  const baseClass =
    'flex items-center justify-center rounded-full w-24 h-24 md:w-32 md:h-32 shadow-lg';

  // Enhanced visual feedback based on audio level (matches VAD threshold)
  const isVoiceDetected = audioLevel > 0.05; // Level ~50 - matches VAD threshold
  const voiceIntensity = Math.min(audioLevel * 20, 1); // Scale for visual effect

  // Clean black styling for all states
  const styles: Record<typeof state, string> = {
    listening: 'bg-black shadow-gray-800/50',
    processing: 'bg-black shadow-gray-800/50', 
    replying: 'bg-black shadow-gray-800/50',
  };

  // Enhanced pulsing animations
  const pulseAnimation = state === 'listening' && isVoiceDetected
    ? { 
        scale: [1, 1.3, 1], // More dramatic pulse when voice detected
        boxShadow: [
          '0 0 20px rgba(0, 0, 0, 0.3)',
          '0 0 40px rgba(0, 0, 0, 0.6)',
          '0 0 20px rgba(0, 0, 0, 0.3)'
        ]
      }
    : state === 'listening'
    ? { 
        scale: [1, 1.1, 1], // Gentle pulse when waiting
        opacity: [0.8, 1, 0.8]
      }
    : state === 'processing'
    ? { 
        scale: [1, 0.5, 1], // Half size pulse for thinking mode
        opacity: [1, 0.7, 1]
      }
    : { scale: [1, 1.05, 1] }; // Minimal pulse for replying

  return (
    <motion.div
      className={`${baseClass} ${styles[state]}`}
      animate={pulseAnimation}
      transition={{ 
        repeat: Infinity, 
        duration: state === 'listening' && isVoiceDetected ? 0.4 : // Fast pulse when voice detected
                 state === 'listening' ? 1.5 : // Gentle breathing when waiting
                 state === 'processing' ? 1.2 : // Quick thinking pulse
                 2, // Slow replying pulse
        ease: 'easeInOut' 
      }}
    />
  );
};
