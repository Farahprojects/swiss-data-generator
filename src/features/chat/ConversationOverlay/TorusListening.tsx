import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from 'framer-motion';

type TorusListeningProps = {
  /** Set true while your app is in “listening” state (after a user gesture). */
  active: boolean;
  /** Size of the whole widget in pixels. */
  size?: number;
  /** The path or URL to the torus image. */
  imageUrl?: string;
};

// Manually calibrated positions to overlay dots on the torus image.
// These percentages are { top, left }.
const DOT_POSITIONS = [
  { top: '50%', left: '15%' },
  { top: '25%', left: '25%' },
  { top: '15%', left: '50%' },
  { top: '25%', left: '75%' },
  { top: '50%', left: '85%' },
  { top: '75%', left: '75%' },
  { top: '85%', left: '50%' },
  { top: '75%', left: '25%' },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function TorusListening({
  active,
  size = 180,
  imageUrl = "/tora.png", // Assumes tora.png is in the /public folder
}: TorusListeningProps) {
  const [level, setLevel] = useState(0); // 0..1 smoothed audio level
  const [time, setTime] = useState(0);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    let mounted = true;

    async function start() {
      if (!active) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        streamRef.current = stream;
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        dataRef.current = new Uint8Array(analyser.frequencyBinCount);

        loop();
      } catch (e) {
        console.warn("Mic unavailable:", e);
        loop(); 
      }
    }

    function stop() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (analyserRef.current) analyserRef.current.disconnect();
      // Let GC handle the rest
      rafRef.current = null;
      streamRef.current = null;
      analyserRef.current = null;
      dataRef.current = null;
    }

    function loop() {
      const tick = () => {
        if (!mounted) return;
        
        setTime(performance.now());
        
        const analyser = analyserRef.current;
        const buf = dataRef.current;
        if (analyser && buf) {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          buf.forEach(v => sum += ((v - 128) / 128) ** 2);
          const rms = Math.sqrt(sum / buf.length);
          setLevel(prev => lerp(prev, rms, 0.2));
        } else {
          setLevel(prev => lerp(prev, 0, 0.1));
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    }

    if (active) start();
    else stop();

    return () => {
      mounted = false;
      stop();
    };
  }, [active]);

  const energy = Math.min(1, level * 10); // Amplify sensitivity
  const t = time / 2000; // Slow down the idle animation timing

  return (
    <div
      aria-label="Listening"
      role="img"
      style={{
        width: size,
        height: size,
        position: 'relative',
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {DOT_POSITIONS.map((pos, idx) => {
        // Create a slow, circular wave for the idle state
        const angle = t + idx * (Math.PI / 4);
        const idleBreathe = 0.5 + 0.5 * Math.sin(angle);
        
        // Combine idle breathing with voice energy
        const intensity = lerp(idleBreathe * 0.1, 1.0, energy);

        // Animate color, size, and a subtle glow
        const color = `rgba(255, 255, 255, ${lerp(0.3, 0.9, intensity)})`;
        const scale = lerp(1, 1.5, intensity);
        const dotSize = size * 0.05;

        return (
          <motion.div
            key={idx}
            className="absolute rounded-full"
            style={{
              top: pos.top,
              left: pos.left,
              width: dotSize,
              height: dotSize,
              backgroundColor: color,
              boxShadow: `0 0 ${lerp(2, 10, intensity)}px rgba(255, 255, 255, ${lerp(0, 0.5, intensity)})`,
              transform: 'translate(-50%, -50%)', // Center the dot
            }}
            animate={{ scale }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          />
        );
      })}
    </div>
  );
}
