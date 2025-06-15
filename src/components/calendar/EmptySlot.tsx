
import React from "react";

type EmptySlotProps = {
  timeLabel?: string;
  onCreate?: () => void;
  interactive?: boolean;
};

const EmptySlot: React.FC<EmptySlotProps> = ({
  timeLabel,
  onCreate,
  interactive = true,
}) => {
  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        h-14 px-1
        rounded-lg transition
        ${interactive ? "cursor-pointer hover:bg-accent/70 hover:shadow-lg" : ""}
        group
        bg-gradient-to-b from-accent/50 via-white to-accent/40
        `}
      onClick={onCreate}
      style={{
        minHeight: "48px",
        border: "1px dashed #e5e7eb",
        zIndex: 0,
      }}
      tabIndex={interactive ? 0 : undefined}
      aria-label={timeLabel ? `Empty slot at ${timeLabel}` : "Empty slot"}
    >
      {timeLabel && (
        <span className="absolute left-1 top-1 text-xs text-muted-foreground opacity-50">
          {timeLabel}
        </span>
      )}
      <span className="opacity-0 group-hover:opacity-90 text-sm text-primary font-semibold pointer-events-none transition select-none">
        + Add Event
      </span>
    </div>
  );
};

export default EmptySlot;
