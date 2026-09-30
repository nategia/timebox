import { useEffect, useState } from "react";
import { TaskList } from "./components/TaskList";
import { Timeline } from "./components/Timeline";

export function App() {
  const [pickedTaskId, setPickedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!pickedTaskId) return;
    const cancel = (e: KeyboardEvent) => e.key === "Escape" && setPickedTaskId(null);
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [pickedTaskId]);

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-gutter py-6 md:grid-cols-[22rem_1fr]">
      <header className="md:col-span-2">
        <h1 className="font-serif text-2xl">Today</h1>
      </header>
      <TaskList pickedTaskId={pickedTaskId} onPick={setPickedTaskId} />
      <Timeline pickedTaskId={pickedTaskId} onPlaced={() => setPickedTaskId(null)} />
    </main>
  );
}
