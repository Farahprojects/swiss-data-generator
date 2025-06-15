
import React, { useState, useEffect } from "react";
import { CalendarSession, EventType } from "@/types/calendar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarSession, "id">, id?: string) => void;
  initial?: CalendarSession | null;
  clients: { id: string; name: string }[];
  isMobile?: boolean;
};

const eventTypes: { label: string; value: EventType }[] = [
  { label: "Session", value: "session" },
  { label: "Check-in", value: "check-in" },
  { label: "Task", value: "task" },
  { label: "Other", value: "other" },
];

const colorOptions = [
  "#a5b4fc", // light indigo
  "#fef08a", // yellow
  "#bbf7d0", // green
  "#fca5a5", // red
  "#fdba74", // orange
  "#fcd34d", // gold
  "#67e8f9", // blue
  "#c4b5fd", // purple
  "#f9a8d4", // pink
];

export const EventModal = ({
  open,
  onClose,
  onSave,
  initial,
  clients,
  isMobile = false,
}: Props) => {
  const [form, setForm] = useState<Omit<CalendarSession, "id">>(
    initial || {
      title: "",
      description: "",
      start_time: new Date(),
      end_time: new Date(),
      client_id: "",
      event_type: "session",
      color_tag: "#a5b4fc",
    }
  );
  const [showCustomColor, setShowCustomColor] = useState(false);

  useEffect(() => {
    setForm(
      initial || {
        title: "",
        description: "",
        start_time: new Date(),
        end_time: new Date(),
        client_id: "",
        event_type: "session",
        color_tag: "#a5b4fc",
      }
    );
    setShowCustomColor(false);
  }, [initial, open]);

  function handleSave() {
    if (!form.title || !form.start_time || !form.end_time) return;
    onSave(form, initial?.id);
    onClose();
  }

  // Responsive full-screen modal for mobile: custom style
  const contentCls = isMobile
    ? "p-4 pt-6 !max-w-full !w-screen !h-screen fixed inset-0 rounded-none flex flex-col"
    : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={contentCls}>
        <div className={`flex flex-col gap-3 ${isMobile ? "h-full" : ""}`}>
          <h2 className="text-lg font-semibold">
            {initial ? "Edit Session" : "Add Session"}
          </h2>
          <Input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className={isMobile ? "mb-2" : ""}
          />
          <Textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className={isMobile ? "mb-2" : ""}
          />
          <div className={`flex ${isMobile ? "flex-col gap-0" : "gap-2"}`}>
            <label className={isMobile ? "flex flex-col mb-2" : "flex-1"}>
              <span className="text-xs text-gray-500">Start</span>
              <Input
                type="datetime-local"
                value={form.start_time.toISOString().slice(0, 16)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    start_time: new Date(e.target.value),
                  }))
                }
                className={isMobile ? "text-sm" : ""}
              />
            </label>
            <label className={isMobile ? "flex flex-col mb-2" : "flex-1"}>
              <span className="text-xs text-gray-500">End</span>
              <Input
                type="datetime-local"
                value={form.end_time.toISOString().slice(0, 16)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    end_time: new Date(e.target.value),
                  }))
                }
                className={isMobile ? "text-sm" : ""}
              />
            </label>
          </div>
          <div>
            <label>
              <span className="text-xs text-gray-500">Client</span>
              <select
                className="w-full border px-2 py-2 rounded-md mt-1"
                value={form.client_id || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, client_id: e.target.value }))
                }
              >
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={`flex gap-2 ${isMobile ? "flex-col" : ""}`}>
            <label className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Type</span>
              <select
                className="border rounded px-2 py-1 ml-1"
                value={form.event_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    event_type: e.target.value as EventType,
                  }))
                }
              >
                {eventTypes.map((et) => (
                  <option key={et.value} value={et.value}>
                    {et.label}
                  </option>
                ))}
              </select>
            </label>
            {/* Color Picker UI */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Color</span>
              <div className="flex gap-1 mt-1 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`rounded-full border-2 ${
                      form.color_tag === color
                        ? "border-primary shadow-lg scale-110"
                        : "border-transparent"
                    } w-7 h-7 transition-all hover:scale-110`}
                    style={{ backgroundColor: color }}
                    aria-label={`Pick color ${color}`}
                    onClick={() => {
                      setForm((f) => ({ ...f, color_tag: color }));
                      setShowCustomColor(false);
                    }}
                  />
                ))}
                <button
                  type="button"
                  className={`rounded-full border ${
                    showCustomColor
                      ? "border-primary"
                      : "border-gray-300 hover:border-gray-400"
                  } w-7 h-7 flex items-center justify-center bg-white ml-1`}
                  aria-label="Pick a custom color"
                  onClick={() => setShowCustomColor((v) => !v)}
                >
                  <Palette size={20} className="text-gray-500" />
                </button>
              </div>
              {showCustomColor && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color_tag || "#a5b4fc"}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color_tag: e.target.value }))
                    }
                    className="w-8 h-8 rounded border"
                  />
                  <span className="text-xs font-mono">{form.color_tag}</span>
                </div>
              )}
            </div>
          </div>
          <div
            className={`flex gap-2 justify-end mt-3 ${
              isMobile ? "flex-col-reverse items-stretch" : ""
            }`}
          >
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={isMobile ? "w-full" : ""}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className={isMobile ? "w-full" : ""}
            >
              {initial ? "Save Changes" : "Add Session"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
