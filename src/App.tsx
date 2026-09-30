import { useState } from "react";
import { TaskList } from "./components/TaskList";

export function App() {
  const [pickedTaskId, setPickedTaskId] = useState<string | null>(null);

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-gutter py-6 md:grid-cols-[22rem_1fr]">
      <header className="md:col-span-2">
        <h1 className="font-serif text-2xl">Today</h1>
      </header>
      <TaskList pickedTaskId={pickedTaskId} onPick={setPickedTaskId} />
    </main>
  );
}
