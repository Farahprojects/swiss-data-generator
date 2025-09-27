// Simplified voice waveform - basic energy display

import React, { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  audioLevelRef: React.MutableRefObject<number>;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ audioLevelRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const barsRef = useRef<number[]>([]);
  const lastLevelRef = useRef<number>(0);
  const lastAddTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Calculate available space for waveform
      // Mic button: 32px (w-8) + 4px (right-1) + 4px (gap) + 4px (padding) = 44px from right
      // Left padding: same 44px from left
      const padding = 44; // 32px button + 12px spacing
      const availableWidth = width - (padding * 2);
      const startX = padding;
      
      // Get current audio level
      const level = audioLevelRef.current || 0;
      
      // Only add new bars when there's significant audio energy
      const now = Date.now();
      const energyThreshold = 0.01;
      const minTimeBetweenBars = 100; // 100ms minimum between bars
      
      // Check if we should add a new bar based on energy and timing
      const hasSignificantEnergy = level > energyThreshold;
      const enoughTimePassed = now - lastAddTimeRef.current > minTimeBetweenBars;
      const energyChanged = Math.abs(level - lastLevelRef.current) > 0.005;
      
      if (hasSignificantEnergy && (enoughTimePassed || energyChanged)) {
        barsRef.current.push(level);
        lastAddTimeRef.current = now;
        
        // Keep only bars that fit in available space
        const barWidth = 3;
        const barGap = 1;
        const maxBars = Math.floor(availableWidth / (barWidth + barGap));
        if (barsRef.current.length > maxBars) {
          barsRef.current.shift();
        }
      }
      
      lastLevelRef.current = level;
      
      // Draw bars within the defined space
      const barWidth = 3;
      const barGap = 1;
      const maxHeight = height * 0.8;
      
      barsRef.current.forEach((barLevel, index) => {
        const x = startX + (index * (barWidth + barGap));
        const barHeight = Math.max(2, barLevel * maxHeight);
        const y = (height - barHeight) / 2;
        
        // Only draw if within bounds
        if (x + barWidth <= width - padding) {
          // Use gray color for all bars
          ctx.fillStyle = '#6b7280';
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [audioLevelRef]);

  return (
    <div className="relative w-full h-full pointer-events-none" aria-hidden>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};