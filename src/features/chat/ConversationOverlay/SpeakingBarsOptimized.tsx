import React, { useEffect, useRef } from 'react';
import { directAudioAnimationService } from '@/services/voice/DirectAudioAnimationService';

interface Props {
  isActive: boolean;
  audioLevel?: number; // Deprecated path; kept for compatibility
}

export const SpeakingBarsOptimized: React.FC<Props> = ({ isActive, audioLevel = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const smoothedLevelsRef = useRef<number[]>([0, 0, 0, 0]);

  // 🎯 PURE SERVER-DRIVEN: No client-side math, just direct server values for 4 bars
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const applyLevels = (serverLevels: number[]) => {
      // Simple smoothing: exponential moving average with alpha=0.3
      const alpha = 0.3;
      const smoothedLevels = serverLevels.map((level, index) => {
        const current = smoothedLevelsRef.current[index] || 0;
        return current + alpha * (level - current);
      });
      smoothedLevelsRef.current = smoothedLevels;
      
      // Map 0-1 range to 0.2-1.0 scale range for visual appeal
      const minScale = 0.2;
      const maxScale = 1.0;
      
      smoothedLevels.forEach((level, index) => {
        const scale = minScale + level * (maxScale - minScale);
        containerRef.current!.style.setProperty(`--bar-${index}-scale`, scale.toString());
      });
    };

    // Set initial visual immediately (backward compatibility)
    if (audioLevel > 0) {
      const initialLevels = [audioLevel, audioLevel, audioLevel, audioLevel];
      applyLevels(initialLevels);
    }

    const unsubscribe = directAudioAnimationService.subscribe(applyLevels);
    return () => {
      unsubscribe();
      // Reset smoothed levels when component becomes inactive
      smoothedLevelsRef.current = [0, 0, 0, 0];
    };
  }, [isActive, audioLevel]);

  // Four bars with different base heights: small, big, big, small
  const bars = [
    { id: 0, baseHeight: 0.6, className: 'h-10' }, // Small bar on left
    { id: 1, baseHeight: 0.8, className: 'h-14' }, // Big bar in middle-left
    { id: 2, baseHeight: 0.8, className: 'h-14' }, // Big bar in middle-right
    { id: 3, baseHeight: 0.6, className: 'h-10' }, // Small bar on right
  ];

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-center gap-3 h-16 w-28"
      style={{
        '--bar-0-scale': '1',
        '--bar-1-scale': '1',
        '--bar-2-scale': '1',
        '--bar-3-scale': '1',
        willChange: 'transform', // GPU acceleration hint
      } as React.CSSProperties}
    >
      {bars.map((bar) => (
        <div
          key={bar.id}
          className={`bg-black rounded-full ${bar.className}`}
          style={{
            width: '16px', // All bars same width
            transformOrigin: 'bottom center', // Scale from bottom center
            transform: `scaleY(var(--bar-${bar.id}-scale, 1))`,
            willChange: 'transform', // GPU acceleration hint
            transition: 'none !important', // Disable any CSS transitions
          }}
        />
      ))}
    </div>
  );
};
