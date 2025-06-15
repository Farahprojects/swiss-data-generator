
import React from "react";
import { CalendarSession } from "@/types/calendar";
import { Button } from "@/components/ui/button";

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
    className={`rounded-lg shadow border px-3 py-2 cursor-pointer flex flex-col gap-1`}
    style={{ background: session.color_tag || "#a5b4fc", color: "#242424", opacity: onClick ? 0.97 : 1 }}
  >
    <div className="flex justify-between items-center">
      <span className="font-semibold">{session.title}</span>
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
    <div className="text-xs opacity-80">
      {session.start_time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
      {session.end_time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </div>
    {clientName && <div className="text-xs text-muted-foreground">{clientName}</div>}
    {isDetailed && <div className="text-xs mt-1">{session.description}</div>}
  </div>
);
