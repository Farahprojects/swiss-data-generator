// src/features/chat/VoiceWaveform.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface VoiceWaveformProps {
  audioLevel: number; // RMS value from 0 to 1
}

const NUM_BARS = 30;
const MAX_BAR_HEIGHT = 28;
const BASE_BAR_HEIGHT = 2;

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ audioLevel }) => {
  // Debug: log audio level changes
  console.log('VoiceWaveform audioLevel:', audioLevel);
  
  return (
    <div className="flex items-center justify-center gap-1 w-full h-full px-4">
      {Array.from({ length: NUM_BARS }).map((_, i) => {
        // Create a wavier, more organic effect
        const distance = Math.abs(i - NUM_BARS / 2);
        const damping = 1 - (distance / (NUM_BARS / 2)) ** 2;
        const multiplier = Math.max(0, damping * (Math.sin(distance / 2 + audioLevel * 20) + 1));
        
        const height = BASE_BAR_HEIGHT + Math.min(MAX_BAR_HEIGHT, audioLevel * 150 * multiplier);

        return (
          <motion.div
            key={i}
            className="w-1 bg-gray-400 rounded-full"
            animate={{ height: `${height}px` }}
            transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.5 }}
          />
        );
      })}
    </div>
  );
};
