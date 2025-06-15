import React, { useState, useEffect } from "react";
import { CalendarSession, EventType } from "@/types/calendar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { COLOR_OPTIONS, EVENT_TYPES } from "@/constants/calendarConstants";
import { DateTimePicker } from "./DateTimePicker";
import { DurationPicker } from "./DurationPicker";
import { AlertDialog, AlertDialogContent, AlertDialogTrigger, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarSession, "id">, id?: string) => void;
  onDelete?: (id: string) => void; // NEW: for deleting a session
  initial?: CalendarSession | null;
  clients: { id: string; name: string }[];
  isMobile?: boolean;
  initialDate?: Date;
};

function calculateEndTime(start: Date, duration: { hours: number; minutes: number }) {
  return new Date(start.getTime() + duration.hours * 60 * 60 * 1000 + duration.minutes * 60 * 1000);
}

export const EventModal = ({
  open,
  onClose,
  onSave,
  onDelete,
  initial,
  clients,
  isMobile = false,
  initialDate,
}: Props) => {
  function getInitialDuration() {
    if (initial) {
      const diff = (initial.end_time.getTime() - initial.start_time.getTime()) / 1000 / 60;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return { hours: h, minutes: m };
    }
    return { hours: 1, minutes: 0 };
  }

  const [form, setForm] = useState<Omit<CalendarSession, "id">>(
    initial || {
      title: "",
      description: "",
      start_time: new Date(),
      end_time: new Date(Date.now() + 60 * 60 * 1000),
      client_id: "",
      event_type: "session",
      color_tag: "#2563eb",
    }
  );
  const [duration, setDuration] = useState(getInitialDuration());
  // Remove custom color logic, showCustomColor
  useEffect(() => {
    setForm(
      initial
        ? initial
        : {
            title: "",
            description: "",
            start_time:
              initialDate
                ? (() => {
                    const d = new Date(initialDate);
                    d.setHours(9, 0, 0, 0);
                    return d;
                  })()
                : new Date(),
            end_time:
              initialDate
                ? (() => {
                    const d = new Date(initialDate);
                    d.setHours(10, 0, 0, 0);
                    return d;
                  })()
                : new Date(Date.now() + 60 * 60 * 1000),
            client_id: "",
            event_type: "session",
            color_tag: "#2563eb",
          }
    );
    setDuration(getInitialDuration());
  }, [initial, open, initialDate]);

  useEffect(() => {
    setForm(f => ({
      ...f,
      end_time: calculateEndTime(f.start_time, duration),
    }));
  }, [form.start_time, duration]);

  function handleSave() {
    if (!form.title || !form.start_time) return;
    const clientIdValue =
      form.client_id && form.client_id !== "" ? form.client_id : null;
    onSave({ ...form, client_id: clientIdValue }, initial?.id);
    onClose();
  }

  // -- UI LAYOUT STARTS HERE --
  const modalContent = (
    <div
      className={
        isMobile
          ? "flex flex-col gap-4 p-4 h-full overflow-y-auto"
          : "flex flex-col gap-3"
      }
      style={isMobile ? { maxHeight: "100dvh" } : {}}
    >
      <h2 className="text-lg font-semibold">
        {initial ? "Edit Session" : "Add Session"}
      </h2>
      <Input
        placeholder="Title"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        className={isMobile ? "mb-1" : ""}
      />
      <Textarea
        placeholder="Description"
        value={form.description}
        onChange={(e) =>
          setForm((f) => ({ ...f, description: e.target.value }))
        }
        className={isMobile ? "mb-1" : ""}
      />

      {/* Date/time picker row */}
      <div className="flex flex-col gap-2">
        <DateTimePicker
          label="Date & Start Time"
          value={form.start_time}
          onChange={date => {
            setForm(f => ({
              ...f,
              start_time: date,
            }));
          }}
          minDate={undefined}
        />
        {/* Duration + Color Row, horizontal on desktop, stacked on mobile */}
        <div className={isMobile ? "flex flex-col gap-2 mt-2" : "flex flex-row gap-4 mt-2"}>
          {/* Duration picker */}
          <div className={isMobile ? "" : "flex-1"}>
            <DurationPicker
              value={duration}
              onChange={setDuration}
            />
          </div>
          {/* Color picker */}
          <div className="flex flex-col gap-1 items-start">
            <span className="text-xs text-gray-500 mb-1">Color</span>
            <div className="flex gap-1 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
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
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview of calculated end time */}
      <div className="text-xs text-muted-foreground">
        Session:{" "}
        {(() => {
          const st = form.start_time;
          const et = form.end_time;
          const format12 = (d: Date) => {
            const h = d.getHours() % 12 || 12;
            const m = d.getMinutes().toString().padStart(2, "0");
            const ampm = d.getHours() < 12 ? "AM" : "PM";
            return `${h}:${m} ${ampm}`;
          };
          return `${format12(st)} – ${format12(et)}`;
        })()}
      </div>

      {/* Client Picker */}
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

      {/* Action buttons */}
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
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="bottom"
          className="!max-w-full !w-screen h-[95dvh] p-0 rounded-t-lg flex flex-col"
          style={{
            minHeight: "80dvh",
            maxHeight: "100dvh",
            padding: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {modalContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="">
        {modalContent}
      </DialogContent>
    </Dialog>
  );
};
