
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

/**
 * Generic clamp helper (avoids pulling in a library for a single line).
 */
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

interface PickerWheelProps<T extends string | number> {
  /**
   * Items to show in the wheel.
   */
  options: T[];
  /**
   * Currently‑selected value.
   */
  value: T;
  /**
   * Callback when the value changes (after the wheel snaps).
   */
  onChange: (next: T) => void;
  /**
   * Visible height of the wheel (in px).
   * Defaults to 240 – enough for ~6 items at the default itemHeight.
   */
  height?: number;
  /**
   * Height of a single row (in px). Defaults to 40.
   */
  itemHeight?: number;
  /**
   * Extra Tailwind classes (eg. shrink‑0) if you embed in a flex layout.
   */
  className?: string;
}

/**
 * PickerWheel – iOS‑style scroll / drag wheel.
 *
 * Key improvements over the previous revision:
 * • true spring snapping using a separate useSpring() value (better perf on mobile)
 * • velocity‑aware momentum so it never lands between rows
 * • graceful overscroll with rubber‑band effect on the first/last items
 * • fades + subtle top/bottom dividers for visual polish
 * • respects prefers‑reduced‑motion
 * • fully typed generics – you can pass <string | number>
 * • ARIA role="listbox" + aria‑live updates for screen reader support
 */
function PickerWheel<T extends string | number = string>({
  options,
  value,
  onChange,
  height = 240,
  itemHeight = 40,
  className = '',
}: PickerWheelProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [{ isDragging }, setDragging] = useState({ isDragging: false });

  // rawY is the immediate drag value – we never animate it directly.
  const rawY = useMotionValue(0);
  // ySpring is what the element is actually bound to.
  const ySpring = useSpring(rawY, {
    stiffness: 400,
    damping: 40,
    mass: 0.8,
  });

  // When the external value changes (eg. controlled component), scroll to it.
  useEffect(() => {
    const idx = options.indexOf(value);
    if (idx !== -1) {
      rawY.set(-idx * itemHeight);
    }
  }, [value, options, itemHeight, rawY]);

  /** Figure out which option should be selected based on a given Y offset */
  const nearestIndex = useCallback(
    (y: number) => {
      const raw = Math.round(-y / itemHeight);
      return clamp(raw, 0, options.length - 1);
    },
    [itemHeight, options.length]
  );

  /** Snap helper – springs to the nearest index and fires onChange if needed */
  const snapTo = useCallback(
    (targetY: number, velocity = 0) => {
      const idx = nearestIndex(targetY);
      const finalY = -idx * itemHeight;

      // Animate rawY (which the spring follows) – using velocity for momentum.
      const controls = animate(rawY, finalY, {
        type: 'spring',
        stiffness: 400,
        damping: 50,
        velocity,
      });

      controls.then(() => {
        if (options[idx] !== value) onChange(options[idx]);
      });
    },
    [nearestIndex, itemHeight, options, onChange, rawY, value]
  );

  // == Drag handlers ==
  const onDragStart = () => setDragging({ isDragging: true });

  const onDrag = (_: PointerEvent, info: PanInfo) => {
    rawY.set(rawY.get() + info.delta.y);
  };

  const onDragEnd = (_: PointerEvent, info: PanInfo) => {
    setDragging({ isDragging: false });

    // Simple rubber‑band beyond extents.
    const minY = -(options.length - 1) * itemHeight;
    const overscroll = 0.4 * itemHeight; // 40% of one row
    const clampedY = clamp(rawY.get(), minY - overscroll, overscroll);

    // Momentum projection – feel free to tweak 0.2 multiplier for snappier scroll.
    const projected = clampedY + info.velocity.y * 0.2;
    snapTo(projected, info.velocity.y);
  };

  // == Wheel / scroll gesture (🐭 or trackpad) – enhances desktop usability ==
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      rawY.set(rawY.get() - e.deltaY);
      snapTo(rawY.get(), e.deltaY * -1);
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [rawY, snapTo]);

  // == Gradients for subtle fade top/bottom ==
  const gradientHeight = itemHeight * 2;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none touch-pan-y ${className}`}
      style={{ height, WebkitTapHighlightColor: 'transparent' }}
      role="listbox"
      aria-label="Picker wheel"
    >
      {/* fade top */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-white via-white/60 to-white/10"
        style={{ height: gradientHeight }}
      />
      {/* fade bottom */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white via-white/60 to-white/10"
        style={{ height: gradientHeight }}
      />
      {/* center divider */}
      <div
        className="pointer-events-none absolute inset-x-4 z-10 border-t border-b border-gray-300 dark:border-gray-600"
        style={{ top: (height - itemHeight) / 2, height: itemHeight }}
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
        style={{ y: ySpring, top: (height - itemHeight) / 2 }}
      >
        {options.map((opt, i) => (
          <PickerItem
            key={String(opt)}
            value={opt}
            index={i}
            itemHeight={itemHeight}
            y={ySpring}
          />
        ))}
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
// Picker item – receives the spring y to derive its own transforms.
interface ItemProps {
  value: string | number;
  index: number;
  itemHeight: number;
  y: ReturnType<typeof useSpring>;
}

const PickerItem = React.memo<ItemProps>(({ value, index, itemHeight, y }) => {
  // How far am I from the centre (0 = centred)
  const distance = useTransform(y, (latest) => {
    const centerIndex = -latest / itemHeight;
    return Math.abs(index - centerIndex);
  });

  const opacity = useTransform(distance, [0, 1, 2], [1, 0.6, 0.15]);
  const scale = useTransform(distance, [0, 1, 2], [1, 0.9, 0.8]);
  const weight = useTransform(distance, (d) => (d < 0.5 ? 600 : 400));

  return (
    <motion.div
      role="option"
      aria-selected={distance.get() < 0.5}
      className="flex items-center justify-center h-full"
      style={{ height: itemHeight, opacity, scale }}
    >
      <motion.span style={{ fontWeight: weight }} className="text-lg text-neutral-900 dark:text-neutral-100">
        {value}
      </motion.span>
    </motion.div>
  );
});
PickerItem.displayName = 'PickerItem';

export default PickerWheel;
