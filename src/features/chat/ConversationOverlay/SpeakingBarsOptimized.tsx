import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  isActive: boolean;
  audioLevel?: number;
}

export const SpeakingBarsOptimized: React.FC<Props> = ({ isActive, audioLevel = 0 }) => {
  // Four bars with slightly different responsiveness for a subtle wave effect
  const bars = Array.from({ length: 4 }, (_, index) => {
    const responsiveness = 0.6 + index * 0.12; // 0.6, 0.72, 0.84, 0.96

    // Scale from center: keep it smaller at rest and grow with audio
    // Half-size baseline so it feels compact ("not long candles")
    const minScale = 0.45;
    const extra = Math.min(0.75, audioLevel * responsiveness); // cap growth
    const scaleY = minScale + extra; // 0.45 .. ~1.2

    return {
      id: index,
      scaleY,
      delay: index * 0.06, // slight phase shift
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
            height: '56px', // shorter overall height; we animate from center
            transformOrigin: 'center',
          }}
          animate={{
            scaleY: bar.scaleY,
            opacity: audioLevel > 0.02 ? 1 : 0.7,
          }}
          transition={{
            scaleY: {
              type: 'spring',
              stiffness: 380,
              damping: 26,
              delay: bar.delay,
            },
            opacity: { duration: 0.15 },
          }}
        />
      ))}
    </div>
  );
};
