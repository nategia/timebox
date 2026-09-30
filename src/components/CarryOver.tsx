import { useMemo, useState } from "react";
import { formatDuration } from "@/domain/time";
import { previousUnfinished, useDayStore, useToday } from "@/store/day-store";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";

/** Morning prompt: bring yesterday's unfinished tasks into today, or start fresh. */
export function CarryOver() {
  const days = useDayStore((s) => s.days);
  const todayKey = useDayStore((s) => s.today);
  const settings = useDayStore((s) => s.settings);
  const carryOver = useDayStore((s) => s.carryOver);
  const { carryOverHandled } = useToday();
  const previous = useMemo(
    () => previousUnfinished({ days, today: todayKey, settings }),
    [days, todayKey, settings],
  );
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  if (carryOverHandled || !previous) return null;

  const toggle = (id: string) =>
    setSkipped((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <section className="rounded-lg border bg-card p-4 text-sm md:col-span-2" aria-label="Carry over">
      <p className="mb-2">
        {previous.tasks.length} unfinished from {previous.date}. Bring them into today?
      </p>
      <ul className="mb-3 flex flex-col gap-1">
        {previous.tasks.map((t) => (
          <li key={t.id}>
            <label className="flex items-center gap-2">
              <Checkbox checked={!skipped.has(t.id)} onCheckedChange={() => toggle(t.id)} />
              <span className="flex-1 truncate">{t.name}</span>
              <span className="text-xs text-muted-foreground">{formatDuration(t.minutes)}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => carryOver(previous.tasks.filter((t) => !skipped.has(t.id)).map((t) => t.id))}
        >
          Carry over
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => carryOver([])}>Start fresh</Button>
      </div>
    </section>
  );
}
