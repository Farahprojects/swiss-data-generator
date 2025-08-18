import React from 'react';
import { motion } from 'framer-motion';
import { SpeakingBars } from './SpeakingBars';
import { ListeningWaveform } from './ListeningWaveform';
import { useTtsAudioLevel } from '@/hooks/useTtsAudioLevel';

interface Props {
  state: 'listening' | 'processing' | 'replying';
  audioLevel?: number;
}

export const VoiceBubble: React.FC<Props> = ({ state, audioLevel = 0 }) => {
  const ttsAudioLevel = useTtsAudioLevel();

  // Show speaking bars for replying state
  if (state === 'replying') {
    return <SpeakingBars audioLevel={ttsAudioLevel} />;
  }

  // Show waveform for listening state
  if (state === 'listening') {
    return (
      <div className="flex items-center justify-center rounded-full w-28 h-28 md:w-36 md:h-36 bg-black shadow-lg">
        <ListeningWaveform audioLevel={audioLevel} barCount={5} />
      </div>
    );
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

  // Smooth, subtle pulse of the whole bubble (processing only)
  const pulseAnimation =
    state === 'processing'
      ? {
          scale: [1, 0.98, 1], // very subtle "thinking" contraction
          opacity: [1, 0.98, 1],
        }
      : { scale: [1, 1, 1], opacity: [1, 1, 1] };

  const duration = 1.2;

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
