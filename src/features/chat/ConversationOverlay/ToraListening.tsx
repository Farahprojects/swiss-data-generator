import React from 'react';
import { motion } from 'framer-motion';

interface ToraListeningProps {
  audioLevel: number;
  imageUrl?: string; // Optional: allow overriding the image source
}

// Percentage positions for dots over the image (tweakable without code changes)
// These are generic, aesthetically spaced positions. Adjust as needed to match the exact artwork.
const DOT_POSITIONS: Array<{ top: string; left: string }> = [
  { top: '18%', left: '30%' },
  { top: '22%', left: '62%' },
  { top: '40%', left: '20%' },
  { top: '42%', left: '78%' },
  { top: '62%', left: '30%' },
  { top: '66%', left: '62%' },
  { top: '50%', left: '50%' },
  { top: '32%', left: '46%' },
];

export const ToraListening: React.FC<ToraListeningProps> = ({ audioLevel, imageUrl }) => {
  // Map audio level (0..~0.2 typical) to a subtle brightness shift
  const clamped = Math.max(0, Math.min(1, audioLevel * 8));

  // Base and active colors with subtle shift on voice
  // Use grayscale palette for minimal Apple-style aesthetic
  const dotBaseColor = `rgba(255,255,255,${0.7 + clamped * 0.2})`;
  const dotBorderColor = `rgba(0,0,0,${0.25 + clamped * 0.25})`;

  const resolvedImage = imageUrl || '/tora.png'; // Place tora.png in public/ or pass full URL

  return (
    <div
      className="relative rounded-full shadow-lg"
      style={{ width: 128, height: 128 }}
      aria-label="Listening"
    >
      {/* Background image */}
      <div
        className="absolute inset-0 rounded-full bg-center bg-cover"
        style={{ backgroundImage: `url(${resolvedImage})` }}
      />

      {/* Subtle inner overlay to ensure dots have contrast on any image */}
      <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(0,0,0,0.08)' }} />

      {/* Animated dots */}
      {DOT_POSITIONS.map((pos, idx) => (
        <motion.div
          key={idx}
          className="absolute rounded-full"
          style={{
            top: pos.top,
            left: pos.left,
            width: 10,
            height: 10,
            marginTop: -5,
            marginLeft: -5,
            backgroundColor: dotBaseColor,
            border: `1px solid ${dotBorderColor}`,
            boxShadow: `0 0 ${6 + clamped * 6}px rgba(255,255,255,${0.25 + clamped * 0.2})`,
          }}
          animate={{
            scale: [1, 1 + clamped * 0.25, 1],
            opacity: [0.9, 1, 0.9],
          }}
          transition={{
            duration: 1 + (idx % 3) * 0.15,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: (idx % 4) * 0.08,
          }}
        />
      ))}
    </div>
  );
};

export default ToraListening;
