// Simplified voice waveform - basic energy display with debug

import React, { useEffect, useRef, useState } from 'react';

interface VoiceWaveformProps {
  audioLevelRef: React.MutableRefObject<number>;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ audioLevelRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const barsRef = useRef<number[]>([]);
  const [debugLevel, setDebugLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

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
      
      // Get current audio level
      const level = audioLevelRef.current || 0;
      
      // Update debug state
      setDebugLevel(level);
      setIsSpeaking(level > 0.02);
      
      // Add new bar
      barsRef.current.push(level);
      
      // Keep only recent bars
      const maxBars = Math.floor(width / 4);
      if (barsRef.current.length > maxBars) {
        barsRef.current.shift();
      }
      
      // Draw bars
      const barWidth = 3;
      const barGap = 1;
      const maxHeight = height * 0.8;
      
      barsRef.current.forEach((barLevel, index) => {
        const x = index * (barWidth + barGap);
        const barHeight = Math.max(2, barLevel * maxHeight);
        const y = (height - barHeight) / 2;
        
        // Color based on speaking threshold
        ctx.fillStyle = barLevel > 0.02 ? '#ef4444' : '#6b7280';
        ctx.fillRect(x, y, barWidth, barHeight);
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
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Debug overlay */}
      <div className="absolute top-2 left-2 bg-black/80 text-white text-xs p-2 rounded font-mono">
        <div>Level: {debugLevel.toFixed(4)}</div>
        <div>Speaking: {isSpeaking ? 'YES' : 'NO'}</div>
        <div>Threshold: 0.02</div>
      </div>
    </div>
  );
};