

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  animate,
  PanInfo,
  useTransform,
} from 'framer-motion';

// Helper – clamp a value between two bounds
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

interface PickerWheelProps<T extends string | number> {
  options: T[];
  value: T;
  onChange: (next: T) => void;
  height?: number; // visible height of the wheel
  itemHeight?: number; // height of each row
  className?: string; // extra Tailwind classes
}

/**
 * PickerWheel – polished iOS‑style scroll wheel.
 *
 * Features
 * • true spring snapping + momentum
 * • rubber‑band overscroll
 * • fade masks top/bottom
 * • clean selection lane with thin divider lines (iOS style)
 * • a11y listbox semantics
 */
function PickerWheel<T extends string | number = string>({
  options,
  value,
  onChange,
  height = 240,
  itemHeight = 40,
  className = '',
}: PickerWheelProps<T>) {
  /* --------------------------------------------------------------------- */
  // Refs & motion values
  const containerRef = useRef<HTMLDivElement>(null);
  const rawY = useMotionValue(0);
  const y = useSpring(rawY, { stiffness: 400, damping: 45, mass: 0.8 });

  const [{ isDragging }, setDrag] = useState({ isDragging: false });

  /* --------------------------------------------------------------------- */
  // Keep wheel in sync with external value
  useEffect(() => {
    const idx = options.indexOf(value);
    if (idx !== -1) {
      // Calculate position so selected item aligns with center
      const centerTop = (height - itemHeight) / 2;
      const finalY = centerTop - idx * itemHeight;
      // Always snap back to selected value
      rawY.set(finalY);
      y.set(finalY); // Ensures spring is synced too
    }
  }, [value, options, itemHeight, rawY, y, height]);

  // Convert y‑offset → nearest option index
  const nearestIndex = useCallback(
    (yPos: number) => {
      const centerTop = (height - itemHeight) / 2;
      const adjustedY = centerTop - yPos;
      return clamp(Math.round(adjustedY / itemHeight), 0, options.length - 1);
    },
    [itemHeight, options.length, height]
  );

  // Snap helper (springs & fires onChange)
  const snapTo = useCallback(
    (target: number, velocity = 0) => {
      const idx = nearestIndex(target);
      const centerTop = (height - itemHeight) / 2;
      const finalY = centerTop - idx * itemHeight;

      const controls = animate(rawY, finalY, {
        type: 'spring',
        stiffness: 420,
        damping: 50,
        velocity,
      });

      controls.then(() => {
        if (options[idx] !== value) onChange(options[idx]);
      });
    },
    [nearestIndex, rawY, options, onChange, value, height, itemHeight]
  );

  /* --------------------------------------------------------------------- */
  // Drag handlers
  const onDragStart = () => setDrag({ isDragging: true });
  const onDrag = (_: PointerEvent, info: PanInfo) => {
    rawY.set(rawY.get() + info.delta.y);
  };
  const onDragEnd = (_: PointerEvent, info: PanInfo) => {
    setDrag({ isDragging: false });

    const centerTop = (height - itemHeight) / 2;
    const minY = centerTop - (options.length - 1) * itemHeight;
    const maxY = centerTop;
    const rubber = 0.4 * itemHeight;
    const clamped = clamp(rawY.get(), minY - rubber, maxY + rubber);

    // project momentum (0.2 multiplier tuned for mobile feel)
    const projected = clamped + info.velocity.y * 0.2;
    snapTo(projected, info.velocity.y);
  };

  /* --------------------------------------------------------------------- */
  // Wheel / trackpad scroll for desktop
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      rawY.set(rawY.get() - e.deltaY);
      snapTo(rawY.get(), -e.deltaY);
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [rawY, snapTo]);

  /* --------------------------------------------------------------------- */
  // Styling helpers
  const centerTop = (height - itemHeight) / 2;
  const gradientH = itemHeight * 2; // fade height

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Picker wheel"
      className={`relative overflow-hidden select-none touch-pan-y ${className}`}
      style={{ height }}
    >
      {/* top fade */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-white via-white/70 to-transparent dark:from-neutral-900 dark:via-neutral-900/70"
        style={{ height: gradientH }}
      />

      {/* bottom fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white via-white/70 to-transparent dark:from-neutral-900 dark:via-neutral-900/70"
        style={{ height: gradientH }}
      />

      {/* Highlight background for selected item */}
      <div
        className="pointer-events-none absolute inset-x-0 z-0"
        style={{
          top: centerTop,
          height: itemHeight,
          backgroundColor: 'rgba(0,0,0,0.03)',
          borderRadius: 6,
        }}
      />

      {/* selection lane – clean iOS style with just thin borders */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 border-t border-b border-neutral-300 dark:border-neutral-600"
        style={{ top: centerTop, height: itemHeight }}
        aria-hidden="true"
      />

      {/* scrollable list */}
      <motion.div
        drag="y"
        dragElastic={0.2}
        dragMomentum={false}
        onDragStart={onDragStart}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        style={{ y }}
      >
        {options.map((opt, i) => (
          <PickerItem key={String(opt)} index={i} itemHeight={itemHeight} y={y} value={opt} centerTop={centerTop} />
        ))}
      </motion.div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
// Individual row - enhanced for better alignment and selection visibility
interface ItemProps {
  value: string | number;
  index: number;
  itemHeight: number;
  y: ReturnType<typeof useSpring>;
  centerTop: number;
}

const PickerItem = React.memo<ItemProps>(({ value, index, itemHeight, y, centerTop }) => {
  // Distance from centre (0 = centred) - adjusted for new positioning
  const d = useTransform(y, (latest) => Math.abs((centerTop - latest) / itemHeight - index));

  const opacity = useTransform(d, [0, 1, 2], [1, 0.4, 0.1]);
  const scale = useTransform(d, [0, 1], [1, 0.85]);
  const weight = useTransform(d, (dist) => (dist < 0.5 ? 700 : 400));
  const color = useTransform(d, (dist) =>
    dist < 0.5 ? '#111827' : '#9CA3AF' // Tailwind: neutral-900 vs neutral-400
  );

  return (
    <motion.div
      role="option"
      aria-selected={d.get() < 0.5}
      className="flex items-center justify-center h-full"
      style={{
        height: itemHeight,
        opacity,
        scale,
        color,
        fontWeight: weight,
      }}
    >
      <motion.span className="text-lg">{value}</motion.span>
    </motion.div>
  );
});
PickerItem.displayName = 'PickerItem';

export default PickerWheel;

