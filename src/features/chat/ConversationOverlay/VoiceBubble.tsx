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

  // Bubble base
  const baseClass = 'flex items-center justify-center rounded-full w-24 h-24 md:w-32 md:h-32 shadow-lg';

  // Detect voice for a slightly more active pulse when user is speaking
  const isVoiceDetected = audioLevel > 0.05;

  // Styles per state (visual only)
  const styles: Record<'listening' | 'processing' | 'replying', string> = {
    listening: 'bg-black shadow-gray-800/50',
    processing: 'bg-black shadow-gray-800/50',
    replying: 'bg-black shadow-gray-800/50',
  };

  // Smooth, subtle pulse of the whole bubble (no shadow pulsing)
  const pulseAnimation =
    state === 'listening'
      ? {
          scale: isVoiceDetected ? [1, 1.15, 1] : [1, 1.12, 1],
          opacity: [0.94, 1, 0.94],
        }
      : state === 'processing'
      ? {
          scale: [1, 0.98, 1], // very subtle "thinking" contraction
          opacity: [1, 0.98, 1],
        }
      : { scale: [1, 1, 1], opacity: [1, 1, 1] };

  const duration = state === 'listening' ? (isVoiceDetected ? 1.0 : 1.6) : 1.2;

  return (
    <motion.div
      className={`${baseClass} ${styles[state]}`}
      style={{ transformOrigin: 'center', willChange: 'transform, opacity' }}
      animate={{ scale: pulseAnimation.scale, opacity: pulseAnimation.opacity }}
      transition={{
        repeat: Infinity,
        repeatType: 'mirror',
        duration,
        ease: 'easeInOut',
        type: 'tween',
      }}
    />
  );
};
