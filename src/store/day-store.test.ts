import { beforeEach, describe, expect, it } from "vitest";
import { previousUnfinished, useDayStore } from "./day-store";

const task = { name: "Write", minutes: 30, kind: "deep", fixed: false, isBreak: false } as const;

const store = () => useDayStore.getState();
const today = () => store().days[store().today];

beforeEach(() => {
  useDayStore.setState({ days: {}, settings: { start: 480, end: 1260 } });
  store().syncToday(new Date(2026, 8, 30, 9));
});

describe("day store", () => {
  it("places a task and rejects an overlapping one", () => {
    store().addTask(task);
    store().addTask({ ...task, name: "Read" });
    const [a, b] = today().tasks;
    expect(store().placeTask(a.id, 540).ok).toBe(true);
    expect(store().placeTask(b.id, 555)).toEqual({ ok: false, reason: "Overlaps another block" });
    expect(today().blocks).toHaveLength(1);
  });

  it("keeps task length in step with resize", () => {
    store().addTask(task);
    const [a] = today().tasks;
    store().placeTask(a.id, 540);
    store().resizeBlock(today().blocks[0].id, 45);
    expect(today().tasks[0].minutes).toBe(45);
  });

  it("offers unfinished tasks from the previous day", () => {
    store().addTask(task);
    store().addTask({ ...task, name: "Done one" });
    store().updateTask(today().tasks[1].id, { done: true });
    store().syncToday(new Date(2026, 9, 1, 8));
    const previous = previousUnfinished(store());
    expect(previous?.tasks.map((t) => t.name)).toEqual(["Write"]);
    store().carryOver(previous!.tasks.map((t) => t.id));
    expect(today().tasks.map((t) => t.name)).toEqual(["Write"]);
    expect(today().carryOverHandled).toBe(true);
  });

  it("keeps only the last 7 days", () => {
    for (let d = 1; d <= 10; d++) {
      store().syncToday(new Date(2026, 9, d, 9));
      store().addTask(task);
    }
    expect(Object.keys(store().days)).toHaveLength(7);
  });
});
