import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  state: 'listening' | 'processing' | 'replying';
  audioLevel?: number;
}

export const VoiceBubble: React.FC<Props> = ({ state, audioLevel = 0 }) => {
  const baseClass =
    'flex items-center justify-center rounded-full w-40 h-40 md:w-56 md:h-56 shadow-lg';

  // Enhanced visual feedback based on audio level (matches VAD threshold)
  const isVoiceDetected = audioLevel > 0.05; // Level ~50 - matches VAD threshold
  const voiceIntensity = Math.min(audioLevel * 20, 1); // Scale for visual effect

  const styles: Record<typeof state, string> = {
    listening: isVoiceDetected 
      ? `bg-gradient-to-br from-green-400 to-green-500 shadow-green-300/50` // Active voice - green
      : 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-300/30', // Waiting - purple
    processing: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-300/50',
    replying: 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-orange-300/50',
  };

  // Dynamic scaling and pulsing based on voice activity
  const dynamicScale = state === 'listening' && isVoiceDetected 
    ? 1 + (voiceIntensity * 0.15) // Scale up when voice detected
    : 1;

  const pulseAnimation = state === 'listening' && isVoiceDetected
    ? { 
        scale: [dynamicScale, dynamicScale * 1.05, dynamicScale],
        boxShadow: [
          '0 0 20px rgba(34, 197, 94, 0.3)',
          '0 0 40px rgba(34, 197, 94, 0.6)',
          '0 0 20px rgba(34, 197, 94, 0.3)'
        ]
      }
    : state === 'listening'
    ? { opacity: [0.8, 1, 0.8] } // Gentle breathing when waiting
    : state === 'processing'
    ? { opacity: [1, 0.7, 1] }
    : { scale: [1, 1.02, 1], rotate: [0, 2, -2, 0] };

  return (
    <motion.div
      className={`${baseClass} ${styles[state]}`}
      animate={pulseAnimation}
      transition={{ 
        repeat: Infinity, 
        duration: state === 'listening' && isVoiceDetected ? 0.5 : 2, 
        ease: 'easeInOut' 
      }}
    />
  );
};
