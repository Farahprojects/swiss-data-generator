
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
    <div className="flex justify-between items-start w-full">
      <div className="flex items-center gap-2">
        {/* Colored circle */}
        <span className="flex items-center">
          <Circle
            size={16}
            fill={session.color_tag || "#a5b4fc"}
            color={session.color_tag || "#a5b4fc"}
            strokeWidth={2}
            className="mr-1"
          />
        </span>
        <span className="font-semibold text-sm">{session.title}</span>
      </div>
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
    {/* Show client name under the title if available */}
    {clientName && (
      <div className="text-xs text-muted-foreground ml-6 -mt-1">{clientName}</div>
    )}
    <div className="text-xs opacity-80 ml-6">
      {session.start_time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
      {session.end_time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </div>
    {isDetailed && <div className="text-xs mt-1">{session.description}</div>}
  </div>
);

