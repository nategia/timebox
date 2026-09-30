import { useEffect, useState } from "react";
import { CarryOver } from "./components/CarryOver";
import { DaySettings } from "./components/DaySettings";
import { TaskList } from "./components/TaskList";
import { Timeline } from "./components/Timeline";
import { ThemeToggle } from "./components/ThemeToggle";
import { useDayRollover } from "./hooks/use-day-rollover";
import { useTheme } from "./hooks/use-theme";
import { useFlash } from "./hooks/use-flash";
import { formatDateKey } from "./domain/time";
import { DayNav } from "./components/DayNav";
import { useDayStore, useIsPastView, useStorageStatus } from "./store/day-store";

export function App() {
  const [pickedTaskId, setPickedTaskId] = useState<string | null>(null);
  const { message, flash } = useFlash();
  const viewDate = useDayStore((s) => s.viewDate);
  const isPast = useIsPastView();
  const storageFull = useStorageStatus((s) => s.full);
  useDayRollover();
  useTheme();

  // A picked task belongs to today; drop the pick when browsing away.
  useEffect(() => {
    if (isPast) setPickedTaskId(null);
  }, [isPast]);

  useEffect(() => {
    if (!pickedTaskId) return;
    const cancel = (e: KeyboardEvent) => e.key === "Escape" && setPickedTaskId(null);
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [pickedTaskId]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-gutter text-sm">
          <span className="font-semibold tracking-tight">Timebox</span>
          <span className="text-muted-foreground">/</span>
          <DayNav />
          <div className="ml-auto flex items-center gap-3">
            {message && <p role="status" className="text-destructive">{message}</p>}
            <DaySettings onRejected={flash} />
            <ThemeToggle />
          </div>
        </div>
      </header>
      {storageFull && (
        <p role="alert" className="border-b border-destructive/40 bg-destructive/10 px-gutter py-2 text-center text-sm text-destructive">
          Storage is full, so recent changes aren't saved. Export a backup, then clear old data.
        </p>
      )}
      <main className="mx-auto grid max-w-6xl gap-6 px-gutter py-8 md:grid-cols-[22rem_1fr]">
        <h1 className="text-3xl font-semibold tracking-tight md:col-span-2">
          {isPast && viewDate ? formatDateKey(viewDate) : "Today"}
        </h1>
        {!isPast && <CarryOver />}
        <TaskList pickedTaskId={pickedTaskId} onPick={setPickedTaskId} />
        <Timeline pickedTaskId={pickedTaskId} onPlaced={() => setPickedTaskId(null)} />
      </main>
    </div>
  );
}
