// src/features/chat/VoiceWaveform.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface VoiceWaveformProps {
  audioLevel: number; // RMS value from 0 to 1
}

const NUM_BARS = 24;
const MAX_BAR_HEIGHT = 22;
const BASE_BAR_HEIGHT = 3;

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ audioLevel }) => {
  return (
    <div className="flex items-center justify-center gap-[3px] w-full h-full px-3">
      {Array.from({ length: NUM_BARS }).map((_, i) => {
        // Organic symmetry around center with light motion sensitivity
        const center = (NUM_BARS - 1) / 2;
        const distance = Math.abs(i - center);
        const falloff = Math.max(0, 1 - (distance / center) ** 1.5);
        const motion = Math.sin((i * 0.6) + audioLevel * 18) * 0.5 + 0.5;
        const dynamic = audioLevel * 1.4 * falloff * motion;
        const height = Math.max(BASE_BAR_HEIGHT, Math.min(MAX_BAR_HEIGHT, dynamic * MAX_BAR_HEIGHT));

        return (
          <motion.div
            key={i}
            className="w-[2px] rounded-full"
            style={{ background: 'linear-gradient(180deg, rgba(107,114,128,0.85), rgba(156,163,175,0.55))' }}
            animate={{ height }}
            transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.45 }}
          />
        );
      })}
    </div>
  );
};
