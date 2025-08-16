import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  audioLevel: number;
}

export const SpeakingBars: React.FC<Props> = ({ audioLevel }) => {
  // Create 4 bars with different heights
  const bars = Array.from({ length: 4 }, (_, index) => {
    const baseHeight = index === 1 || index === 2 ? 50 : 30; // Taller base heights
    const responsiveness = 0.8 + index * 0.2; // More dynamic response
    const audioHeight = audioLevel * 120 * responsiveness;
    const totalHeight = Math.max(baseHeight, baseHeight + audioHeight);

    return {
      id: index,
      height: totalHeight,
      delay: index * 0.08, // Slightly more pronounced wave effect
    };
  });

  return (
    <div className="flex items-center justify-center gap-3 h-24 w-32">
      {bars.map((bar) => (
        <motion.div
          key={bar.id}
          className="bg-black rounded-full"
          style={{
            width: '18px', // Thicker bars
            height: `${bar.height}px`,
            transformOrigin: 'center', // Animate from the center
          }}
          animate={{
            scaleY: bar.height / (index === 1 || index === 2 ? 50 : 30), // Animate scaleY for center expansion
            opacity: audioLevel > 0.01 ? 1 : 0.7,
          }}
          transition={{
            scaleY: {
              type: 'spring',
              stiffness: 400,
              damping: 25,
              delay: bar.delay,
            },
            opacity: {
              duration: 0.2,
            },
          }}
        />
      ))}
    </div>
  );
};