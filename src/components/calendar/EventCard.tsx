
import React from "react";
import { CalendarSession } from "@/types/calendar";
import { Button } from "@/components/ui/button";
import { Circle } from "lucide-react";

type Props = {
  session: CalendarSession;
  onClick?: () => void;
  onDelete?: () => void;
  isDetailed?: boolean;
  clientName?: string;
};

export const EventCard = ({
  session,
  onClick,
  onDelete,
  isDetailed,
  clientName,
}: Props) => (
  <div
    onClick={onClick}
    className={`rounded-lg shadow border px-3 py-2 cursor-pointer flex flex-col gap-1 bg-white hover:bg-gray-50 transition`}
    style={{ color: "#242424", opacity: onClick ? 0.97 : 1 }}
  >
    {/* Top Row: Dot + Client Name */}
    <div className="flex items-center gap-2">
      <Circle
        size={16}
        fill={session.color_tag || "#a5b4fc"}
        color={session.color_tag || "#a5b4fc"}
        strokeWidth={2}
      />
      {clientName && (
        <span className="font-bold text-sm">{clientName}</span>
      )}
    </div>
    {/* Title & Delete Button */}
    <div className="flex justify-between items-start w-full mt-0.5">
      <span className="font-semibold text-sm ml-6">{session.title}</span>
      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={e => {
            e.stopPropagation();
            onDelete?.();
          }}
        >
          ×
        </Button>
      )}
    </div>
    {/* Time */}
    <div className="text-xs opacity-80 ml-6">
      {session.start_time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })} -{" "}
      {session.end_time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}
    </div>
    {/* Description (for isDetailed) */}
    {isDetailed && <div className="text-xs mt-1">{session.description}</div>}
  </div>
);
