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
import { useDayStore } from "./store/day-store";

export function App() {
  const [pickedTaskId, setPickedTaskId] = useState<string | null>(null);
  const { message, flash } = useFlash();
  const today = useDayStore((s) => s.today);
  useDayRollover();
  useTheme();

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
          <span className="text-muted-foreground">{formatDateKey(today)}</span>
          <div className="ml-auto flex items-center gap-3">
            {message && <p role="status" className="text-destructive">{message}</p>}
            <DaySettings onRejected={flash} />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-gutter py-8 md:grid-cols-[22rem_1fr]">
        <h1 className="text-3xl font-semibold tracking-tight md:col-span-2">Today</h1>
        <CarryOver />
        <TaskList pickedTaskId={pickedTaskId} onPick={setPickedTaskId} />
        <Timeline pickedTaskId={pickedTaskId} onPlaced={() => setPickedTaskId(null)} />
      </main>
    </div>
  );
}
