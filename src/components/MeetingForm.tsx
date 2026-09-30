import { useState } from "react";
import { parseTime } from "@/domain/time";
import { useDayStore } from "@/store/day-store";
import { Button, Input } from "./ui";

/** Meetings are entered by hand until Google Calendar sync (plan 002). */
export function MeetingForm({ onRejected }: { onRejected: (reason: string) => void }) {
  const addEvent = useDayStore((s) => s.addEvent);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("10:00");
  const [minutes, setMinutes] = useState(30);

  if (!open) {
    return (
      <Button className="self-start" onClick={() => setOpen(true)}>
        + Add meeting
      </Button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2 rounded-sm border bg-surface p-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const start = parseTime(time);
        if (!title.trim() || start === null) return onRejected("Add a title and a time like 10:00");
        const result = addEvent(title.trim(), start, minutes);
        if (!result.ok) return onRejected(result.reason);
        setTitle("");
        setOpen(false);
      }}
    >
      <Input autoFocus aria-label="Meeting title" placeholder="Meeting" className="min-w-0 flex-1" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input aria-label="Meeting start" className="w-20" value={time} onChange={(e) => setTime(e.target.value)} />
      <Input
        aria-label="Meeting length in minutes"
        type="number"
        min={5}
        step={5}
        className="w-16"
        value={minutes || ""}
        onChange={(e) => setMinutes(e.target.valueAsNumber || 0)}
      />
      <Button onClick={() => setOpen(false)}>Cancel</Button>
      <Button type="submit" variant="primary">
        Add
      </Button>
    </form>
  );
}
