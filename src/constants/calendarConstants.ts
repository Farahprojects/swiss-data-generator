
import { EventType } from "@/types/calendar";

// Popular calendar hex colors
export const COLOR_OPTIONS = [
  "#2563eb", // blue-600
  "#ef4444", // red-500
  "#22c55e", // green-500
  "#eab308", // yellow-500
  "#f97316", // orange-500
  "#a21caf", // purple-800
];

// Allowed event types
export const EVENT_TYPES: { label: string, value: EventType }[] = [
  { label: "Session", value: "session" },
  { label: "Check-in", value: "check-in" },
  { label: "Task", value: "task" },
  { label: "Other", value: "other" },
];
