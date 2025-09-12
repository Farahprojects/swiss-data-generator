// src/features/chat/VoiceWaveform.tsx
import React, { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  audioLevelRef: React.MutableRefObject<number>; // Real-time level (0..1)
}

// Canvas-based scrolling "reel" waveform for maximum smoothness on mobile/Safari.
// UI-only smoothing and clamping applied; raw signal is untouched.
export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ audioLevelRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const xRef = useRef<number>(0);
  const uiLevelRef = useRef<number>(0);

  const isSafari = typeof navigator !== 'undefined'
    && /safari/i.test(navigator.userAgent)
    && !/chrome|chromium|android/i.test(navigator.userAgent);

  // Resize canvas to container with devicePixelRatio for crisp rendering
  const resizeCanvas = () => {
    if (!canvasRef.current || !containerRef.current) return;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const { clientWidth, clientHeight } = containerRef.current;
    canvasRef.current.width = Math.max(1, Math.floor(clientWidth * dpr));
    canvasRef.current.height = Math.max(1, Math.floor(clientHeight * dpr));
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, clientWidth, clientHeight);
      xRef.current = clientWidth - 1; // start drawing at right edge
    }
  };

  // Animation loop: scroll content left by 1px, draw new vertical line at right
  const animate = () => {
    const now = performance.now();
    const targetFps = 30; // steady 30fps is sufficient and smooth
    const frameInterval = 1000 / targetFps;
    if (now - lastTickRef.current < frameInterval) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }
    lastTickRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    const ctx = canvas.getContext('2d');
    const container = containerRef.current;
    if (!ctx || !container) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Smooth UI level (UI only; do not modify audioLevelRef)
    const raw = audioLevelRef.current; // 0..1
    const alpha = isSafari ? 0.18 : 0.12; // Safari a bit more smoothing
    uiLevelRef.current = uiLevelRef.current + (raw - uiLevelRef.current) * alpha;
    const level = isSafari ? Math.min(uiLevelRef.current, 0.25) : uiLevelRef.current;

    // Scroll existing content 1px to the left
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(canvas, 1, 0, width - 1, height, 0, 0, width - 1, height);
    ctx.globalCompositeOperation = 'source-over';

    // Clear rightmost 1px column
    ctx.clearRect(width - 1, 0, 1, height);

    // Map level to vertical line height around center baseline
    const centerY = height / 2;
    const maxLineHeight = Math.max(6, Math.floor(height * 0.8));
    const total = Math.max(2, Math.min(maxLineHeight, Math.floor(level * maxLineHeight)));
    const top = centerY - total / 2;

    // Draw the new line at right edge
    ctx.fillStyle = '#000000';
    ctx.fillRect(width - 1, top, 1, total);

    rafRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    resizeCanvas();
    const ro = new (window as any).ResizeObserver?.(() => resizeCanvas());
    if (ro && containerRef.current) ro.observe(containerRef.current);

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (ro && containerRef.current) ro.unobserve(containerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full px-4">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
