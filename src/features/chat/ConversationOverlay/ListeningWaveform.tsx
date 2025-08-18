import React, { useEffect, useMemo, useRef, useState } from 'react';

interface ListeningWaveformProps {
	audioLevel: number; // 0..1 scalar from microphone service
	barCount?: number; // number of bars to render (defaults to 5 for thicker look)
	className?: string;
}

// Minimal, dependency-free waveform that updates via rAF
// Uses lightweight transforms only; no external animation libs
export const ListeningWaveform: React.FC<ListeningWaveformProps> = ({
	audioLevel,
	barCount = 5,
	className = '',
}) => {
	// Target heights for each bar (0..1), smoothed for stability
	const [heights, setHeights] = useState<number[]>(() => Array.from({ length: barCount }, () => 0));
	const rafRef = useRef<number | null>(null);
	const timeRef = useRef<number>(0);

	// Precompute per-bar phases and responsiveness for subtle variation
	const barMeta = useMemo(
		() =>
			Array.from({ length: barCount }, (_v, i) => ({
				phase: i * 0.9 + 0.25,
				freq: 1.2 + i * 0.35,
				response: 0.75 + i * 0.08, // slightly different responsiveness per bar
			})),
		[barCount]
	);

	useEffect(() => {
		const animate = (t: number) => {
			timeRef.current = t / 1000; // seconds

			// Base amplitude from audioLevel with a gentle curve
			const base = Math.min(1, Math.max(0, Math.sqrt(Math.max(0, audioLevel))));

			setHeights((prev) => {
				const next = prev.map((h, i) => {
					const meta = barMeta[i];
					// Add a subtle wave motion so quiet input still looks alive
					const wave = 0.15 * Math.max(0, Math.sin(timeRef.current * meta.freq + meta.phase));
					const target = Math.max(0.06, Math.min(1, base * meta.response + wave));
					// Critically damped smoothing toward target
					const smoothed = h + (target - h) * 0.35;
					return smoothed;
				});
				return next;
			});

			rafRef.current = requestAnimationFrame(animate);
		};

		rafRef.current = requestAnimationFrame(animate);
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		};
	}, [audioLevel, barMeta]);

	// Visual params - fewer, thicker bars
	const heightPx = 56;
	const widthPx = barCount * 14 + (barCount - 1) * 10; // bar width 14, gap 10

	return (
		<div
			className={`flex items-end justify-center ${className}`}
			style={{ width: `${widthPx}px`, height: `${heightPx}px` }}
		>
			{heights.map((h, idx) => (
				<div
					key={idx}
					className="bg-black rounded"
					style={{
						width: '14px',
						height: `${Math.max(8, h * heightPx)}px`,
						marginLeft: idx === 0 ? 0 : '10px',
						transition: 'height 80ms linear, opacity 80ms linear',
						opacity: h > 0.04 ? 1 : 0.8,
					}}
				/>
			))}
		</div>
	);
};

export default ListeningWaveform;


