import React, { useEffect, useRef } from 'react';
import { directAudioAnimationService } from '@/services/voice/DirectAudioAnimationService';

interface Props {
  isActive: boolean;
  audioLevel?: number; // Deprecated path; kept for compatibility
}

export const SpeakingBarsOptimized: React.FC<Props> = ({ isActive, audioLevel = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const smoothRef = useRef(0);

  // 🎯 Subscribe directly to animation service to avoid React per-frame updates
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const baselineHeight = 0.4; // Always visible baseline (40%)
    const maxMovement = 0.6;    // Up to +60%
    const ALPHA = 0.35;         // Smoothing constant (0=butter smooth, 1=raw)

    const update = (level: number) => {
      // Exponential moving average to reduce jitter
      smoothRef.current = smoothRef.current + ALPHA * (level - smoothRef.current);
      const clamped = Math.max(0, Math.min(1, smoothRef.current));
      const scaleY = baselineHeight + clamped * maxMovement;
      containerRef.current!.style.setProperty('--bar-scale', scaleY.toString());
    };

    // Initialize with provided prop for immediate visual while service emits
    update(audioLevel);

    const unsubscribe = directAudioAnimationService.subscribe(update);
    return unsubscribe;
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
        '--bar-scale': '1',
        willChange: 'transform', // GPU acceleration hint
      } as React.CSSProperties}
    >
      {bars.map((bar) => (
        <div
          key={bar.id}
          className={`bg-black rounded-full ${bar.className} transition-transform duration-75`}
          style={{
            width: '16px',
            transformOrigin: 'center',
            transform: `scaleY(var(--bar-scale, 1))`,
            willChange: 'transform',
            transitionTimingFunction: 'cubic-bezier(.2,.8,.4,1)',
          }}
        />
      ))}
    </div>
  );
};
