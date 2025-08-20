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

  // Simple, clear pulse animation
  const getAnimationProps = () => {
    if (state === 'listening') {
      return {
        animate: {
          scale: isVoiceDetected ? [1, 1.2, 1] : [1, 1.15, 1],
        },
        transition: {
          repeat: Infinity,
          duration: isVoiceDetected ? 0.8 : 1.2,
          ease: "easeInOut"
        }
      };
    } else if (state === 'processing') {
      return {
        animate: {
          scale: [1, 0.95, 1],
        },
        transition: {
          repeat: Infinity,
          duration: 1.5,
          ease: "easeInOut"
        }
      };
    }
    return {};
  };

  return (
    <motion.div
      className={`${baseClass} ${styles[state]}`}
      style={{ transformOrigin: 'center' }}
      {...getAnimationProps()}
    />
  );
};
