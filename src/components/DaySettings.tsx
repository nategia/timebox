import { useState } from "react";
import { formatTime, parseTime } from "@/domain/time";
import { useDayStore } from "@/store/day-store";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function DaySettings({ onRejected }: { onRejected: (reason: string) => void }) {
  const settings = useDayStore((s) => s.settings);
  const setSettings = useDayStore((s) => s.setSettings);
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(formatTime(settings.start));
  const [end, setEnd] = useState(formatTime(settings.end));

  if (!editing) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Change day start and end"
        onClick={() => {
          setStart(formatTime(settings.start));
          setEnd(formatTime(settings.end));
          setEditing(true);
        }}
      >
        {formatTime(settings.start)}–{formatTime(settings.end)}
      </Button>
    );
  }

  return (
    <form
      className="flex items-center gap-1 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const s = parseTime(start);
        const en = parseTime(end);
        if (s === null || en === null) return onRejected("Use times like 08:00");
        const result = setSettings({ start: s, end: en });
        if (!result.ok) return onRejected(result.reason);
        setEditing(false);
      }}
    >
      <Input aria-label="Day start" className="w-16 h-8" value={start} onChange={(e) => setStart(e.target.value)} />
      –
      <Input aria-label="Day end" className="w-16 h-8" value={end} onChange={(e) => setEnd(e.target.value)} />
      <Button type="submit" size="sm">
        Save
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
    </form>
  );
}
