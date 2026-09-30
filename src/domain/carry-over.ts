import type { Days, Task } from "./types";

const isOpen = (t: Task) => !t.done && !t.movedTo;

/** Most recent day before `today` that still has unfinished, not-yet-moved tasks. */
export function findSource(days: Days, today: string): string | null {
  return (
    Object.keys(days)
      .filter((k) => k < today && days[k].tasks.some(isOpen))
      .sort()
      .at(-1) ?? null
  );
}

/**
 * Copies the source day's open tasks into today (new ids, unplaced, not done) and marks
 * the originals `movedTo: today`, so the past day still shows what happened.
 * Runs once per day: a reload or second call is a no-op.
 */
export function carryOver(days: Days, today: string, newId: () => string): Days {
  const current = days[today] ?? { tasks: [], blocks: [], carryOverDone: false };
  if (current.carryOverDone) return days;

  const from = findSource(days, today);
  if (!from) return { ...days, [today]: { ...current, carryOverDone: true } };

  const source = days[from];
  const copies = source.tasks.filter(isOpen).map((t) => ({ ...t, id: newId(), done: false }));

  return {
    ...days,
    [from]: { ...source, tasks: source.tasks.map((t) => (isOpen(t) ? { ...t, movedTo: today } : t)) },
    [today]: {
      ...current,
      tasks: [...copies, ...current.tasks],
      carriedIn: { from, taskIds: copies.map((t) => t.id) },
      carryOverDone: true,
    },
  };
}

/** Reverses `carryOver` for today. `carryOverDone` stays true so it doesn't carry again. */
export function undoCarryOver(days: Days, today: string): Days {
  const current = days[today];
  const carried = current?.carriedIn;
  if (!carried) return days;

  const ids = new Set(carried.taskIds);
  const source = days[carried.from];
  return {
    ...days,
    ...(source && {
      [carried.from]: {
        ...source,
        tasks: source.tasks.map((t) => (t.movedTo === today ? { ...t, movedTo: undefined } : t)),
      },
    }),
    [today]: {
      ...current,
      tasks: current.tasks.filter((t) => !ids.has(t.id)),
      blocks: current.blocks.filter((b) => !(b.source === "task" && ids.has(b.taskId))),
      carriedIn: undefined,
    },
  };
}
