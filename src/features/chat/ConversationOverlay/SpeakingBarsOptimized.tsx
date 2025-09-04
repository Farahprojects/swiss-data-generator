import React, { useEffect, useRef } from 'react';
import { directAudioAnimationService } from '@/services/voice/DirectAudioAnimationService';

interface Props {
  isActive: boolean;
  audioLevel?: number; // Deprecated path; kept for compatibility
}

export const SpeakingBarsOptimized: React.FC<Props> = ({ isActive, audioLevel = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetLevelRef = useRef(0);
  const currentLevelRef = useRef(0);
  const velocityRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  // 🎯 Subscribe directly to animation service to avoid React per-frame updates
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const baselineHeight = 0.2; // Lower baseline to increase visible range
    const maxMovement = 0.8;    // Increase travel for stronger motion
    // Minimal spring constants (critically damped feel)
    const stiffness = 36; // snappier follow
    const damping = 0.78; // slightly less damping for liveliness

    // Initialize levels so bars show immediately
    targetLevelRef.current = Math.max(0, Math.min(1, audioLevel));
    currentLevelRef.current = targetLevelRef.current;
    containerRef.current!.style.setProperty(
      '--bar-scale',
      (baselineHeight + currentLevelRef.current * maxMovement).toString()
    );

    const update = (level: number) => {
      // Update only the target; RAF loop performs the spring advance
      targetLevelRef.current = Math.max(0, Math.min(1, level));
    };

    // Initialize with provided prop for immediate visual while service emits
    update(audioLevel);

    const unsubscribe = directAudioAnimationService.subscribe(update);

    // Single RAF loop that springs currentLevel towards targetLevel
    const tick = (ts: number) => {
      if (!containerRef.current) return;
      const last = lastTsRef.current ?? ts;
      let dt = (ts - last) / 1000; // seconds
      lastTsRef.current = ts;
      // Clamp dt to avoid large jumps on tab switch
      if (dt < 0.001) dt = 0.001;
      if (dt > 0.05) dt = 0.05;

      const target = targetLevelRef.current;
      let x = currentLevelRef.current;
      let v = velocityRef.current;

      // Minimal spring: accelerate towards target, apply damping
      const acceleration = (target - x) * stiffness;
      v = (v + acceleration * dt) * damping;
      x = x + v * dt;

      // Clamp and apply
      if (x < 0) { x = 0; v = 0; }
      if (x > 1) { x = 1; v = 0; }
      currentLevelRef.current = x;
      velocityRef.current = v;

      const scaleY = baselineHeight + x * maxMovement;
      containerRef.current.style.setProperty('--bar-scale', scaleY.toString());

      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      unsubscribe();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
      lastTsRef.current = null;
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
        '--bar-scale': '1',
        willChange: 'transform', // GPU acceleration hint
      } as React.CSSProperties}
    >
      {bars.map((bar) => (
        <div
          key={bar.id}
          className={`bg-black rounded-full ${bar.className}`}
          style={{
            width: '16px', // All bars same width
            transformOrigin: 'bottom',
            transform: `scaleY(var(--bar-scale, 1))`,
            willChange: 'transform', // GPU acceleration hint
          }}
        />
      ))}
    </div>
  );
};
