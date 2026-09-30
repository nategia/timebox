import { useEffect, useState } from "react";
import { CarryOver } from "./components/CarryOver";
import { DaySettings } from "./components/DaySettings";
import { TaskList } from "./components/TaskList";
import { Timeline } from "./components/Timeline";
import { useDayRollover } from "./hooks/use-day-rollover";
import { useFlash } from "./hooks/use-flash";

export function App() {
  const [pickedTaskId, setPickedTaskId] = useState<string | null>(null);
  const { message, flash } = useFlash();
  useDayRollover();

  useEffect(() => {
    if (!pickedTaskId) return;
    const cancel = (e: KeyboardEvent) => e.key === "Escape" && setPickedTaskId(null);
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [pickedTaskId]);

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-gutter py-6 md:grid-cols-[22rem_1fr]">
      <header className="flex items-center gap-3 md:col-span-2">
        <h1 className="font-serif text-2xl">Today</h1>
        <DaySettings onRejected={flash} />
        {message && <p role="status" className="text-sm text-destructive">{message}</p>}
      </header>
      <CarryOver />
      <TaskList pickedTaskId={pickedTaskId} onPick={setPickedTaskId} />
      <Timeline pickedTaskId={pickedTaskId} onPlaced={() => setPickedTaskId(null)} />
    </main>
  );
}
