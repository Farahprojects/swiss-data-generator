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
  const pulseAnimation =
    isVoiceDetected
      ? {
          scale: [1, 1.35, 1], // Make the pulse significantly larger when voice is detected
          boxShadow: [
            '0 0 15px rgba(0, 0, 0, 0.3)',
            '0 0 35px rgba(0, 0, 0, 0.6)', // More intense shadow
            '0 0 15px rgba(0, 0, 0, 0.3)',
          ],
        }
      : state === 'listening'
      ? {
          scale: [1, 1.15, 1], // A gentle, larger pulse when waiting
          opacity: [0.9, 1, 0.9],
        }
      : state === 'processing'
      ? {
          scale: [1, 0.95, 1], // A subtle shrink for thinking
        }
      : { scale: [1, 1.02, 1] }; // Default fallback

  return (
    <motion.div
      className={`${baseClass} ${styles[state]}`}
      animate={{
        scale: pulseAnimation.scale,
        boxShadow: pulseAnimation.boxShadow || '0 0 15px rgba(0, 0, 0, 0.3)',
      }}
      transition={{
        repeat: Infinity,
        duration:
          state === 'listening' && isVoiceDetected
            ? 0.5 // Faster, more responsive pulse
            : state === 'listening'
            ? 2.5 // Slower breathing when waiting
            : state === 'processing'
            ? 1.5 // A slightly faster thinking pulse
            : 2,
        ease: 'easeInOut',
        type: 'spring',
        stiffness: 100,
        damping: 15,
      }}
    />
  );
};
