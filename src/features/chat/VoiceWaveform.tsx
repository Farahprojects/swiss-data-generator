// src/features/chat/VoiceWaveform.tsx
import React, { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  audioLevelRef: React.MutableRefObject<number>; // Ref to real-time audio level
}

const NUM_BARS = 30;
const MAX_BAR_HEIGHT = 28;
const BASE_BAR_HEIGHT = 2;
const TARGET_FPS = 30;

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ audioLevelRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  // Safari-only UI smoothing/clamp (UI layer only; does not change signal)
  const isSafari = typeof navigator !== 'undefined' && /safari/i.test(navigator.userAgent) && !/chrome|chromium|android/i.test(navigator.userAgent);
  const uiLevelRef = useRef<number>(0);

  // 🎵 Real-time animation loop (no React state updates per frame)
  const animate = () => {
    const now = performance.now();
    const frameInterval = 1000 / TARGET_FPS;

    // Throttle to target FPS for smoother animation
    if (now - lastUpdateTimeRef.current < frameInterval) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    lastUpdateTimeRef.current = now;

    if (!containerRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    // Read raw level from pipeline (do not mutate it)
    let level = audioLevelRef.current;
    // Safari-only: apply gentle UI smoothing + soft cap (UI only)
    if (isSafari) {
      const alpha = 0.18; // smoothing factor for UI animation only
      uiLevelRef.current = uiLevelRef.current + (level - uiLevelRef.current) * alpha;
      level = Math.min(uiLevelRef.current, 0.25); // soft cap keeps bars subtle on Safari
    }
    const bars = containerRef.current.children;
    

    // Update each bar using CSS transforms for better performance
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i] as HTMLElement;
      
      // Create a wavier, more organic effect
      const distance = Math.abs(i - NUM_BARS / 2);
      const damping = 1 - (distance / (NUM_BARS / 2)) ** 2;
      const multiplier = Math.max(0, damping * (Math.sin(distance / 2 + level * 20) + 1));
      
      // Use direct height changes for wave-like up and down movement
      const height = BASE_BAR_HEIGHT + Math.min(MAX_BAR_HEIGHT, level * 150 * multiplier);
      bar.style.height = `${height}px`;
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Start animation when component mounts
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-center gap-1 w-full h-full px-4"
    >
      {Array.from({ length: NUM_BARS }).map((_, i) => (
        <div
          key={i}
          className="w-1 bg-gray-400 rounded-full transition-none"
          style={{ 
            height: `${BASE_BAR_HEIGHT}px`,
            willChange: 'height' // GPU acceleration hint for height changes
          }}
        />
      ))}
    </div>
  );
};
