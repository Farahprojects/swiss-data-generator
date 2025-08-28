import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  audioLevel: number;
}

export const SpeakingBars: React.FC<Props> = ({ audioLevel }) => {
  console.log('[SpeakingBars] 🎵 WAVEFORM SPEAKING ANIMATION ACTIVE - Audio level:', audioLevel);
  // Simple visual feedback - just respond to audio level
  const bars = Array.from({ length: 4 }, (_, index) => {
    // Simple: middle bars slightly taller, all respond to audio
    const isMiddleBar = index === 1 || index === 2;
    const baseHeight = isMiddleBar ? 0.8 : 0.6;
    const audioResponse = Math.min(0.4, audioLevel * 2); // Simple multiplier
    const scaleY = baseHeight + audioResponse;

    return {
      id: index,
      scaleY,
    };
  });

  return (
    <div className="flex items-center justify-center gap-3 h-16 w-28">
      {bars.map((bar) => (
        <motion.div
          key={bar.id}
          className="bg-black rounded-full"
          style={{
            width: '16px', // thicker bars
            height: '56px', // center-anchored height
            transformOrigin: 'center',
          }}
          animate={{
            scaleY: bar.scaleY,
            opacity: audioLevel > 0.02 ? 1 : 0.75,
          }}
          transition={{
            scaleY: {
              type: 'spring',
              stiffness: 380,
              damping: 28,
            },
            opacity: { duration: 0.15 },
          }}
        />
      ))}
    </div>
  );
};