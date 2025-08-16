import React from 'react';
import { motion } from 'framer-motion';
import { SpeakingBars } from './SpeakingBars';
import { useTtsAudioLevel } from '@/hooks/useTtsAudioLevel';

interface Props {
  state: 'listening' | 'processing' | 'replying';
  audioLevel?: number;
}

export const VoiceBubble: React.FC<Props> = ({ state, audioLevel = 0 }) => {
  const ttsAudioLevel = useTtsAudioLevel();

  // Show speaking bars for replying state, bubble for others
  if (state === 'replying') {
    return <SpeakingBars audioLevel={ttsAudioLevel} />;
  }

  // Smoother bubble for listening and processing
  const baseClass =
    'flex items-center justify-center rounded-full w-24 h-24 md:w-32 md:h-32 shadow-lg';

  // Enhanced visual feedback based on audio level (matches VAD threshold)
  const isVoiceDetected = audioLevel > 0.05;

  // Clean black styling for all states (needed for type checking even though replying returns early)
  const styles: Record<'listening' | 'processing' | 'replying', string> = {
    listening: 'bg-black shadow-gray-800/50',
    processing: 'bg-black shadow-gray-800/50', 
    replying: 'bg-black shadow-gray-800/50',
  };

  // Smoother pulsing animations with spring physics
  const pulseAnimation = state === 'listening' && isVoiceDetected
    ? { 
        scale: [1, 1.15, 1], // Reduced dramatic pulse when voice detected
        boxShadow: [
          '0 0 15px rgba(0, 0, 0, 0.3)',
          '0 0 25px rgba(0, 0, 0, 0.5)',
          '0 0 15px rgba(0, 0, 0, 0.3)'
        ]
      }
    : state === 'listening'
    ? { 
        scale: [1, 1.05, 1], // Very gentle pulse when waiting
        opacity: [0.9, 1, 0.9]
      }
    : state === 'processing'
    ? { 
        scale: [1, 0.95, 1], // Subtle shrink for thinking mode
        opacity: [1, 0.85, 1]
      }
    : { scale: [1, 1.02, 1] };

  return (
    <motion.div
      className={`${baseClass} ${styles[state]}`}
      animate={pulseAnimation}
      transition={{ 
        repeat: Infinity, 
        duration: state === 'listening' && isVoiceDetected ? 0.6 : // Smoother fast pulse
                 state === 'listening' ? 2.5 : // Slower breathing when waiting
                 state === 'processing' ? 1.8 : // Smoother thinking pulse
                 2,
        ease: 'easeInOut',
        type: 'spring',
        stiffness: 100,
        damping: 15
      }}
    />
  );
};
