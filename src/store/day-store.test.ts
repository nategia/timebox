import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { guardedStorage, migrate, useDayStore, useStorageStatus } from "./day-store";

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

  it("carries unfinished tasks into the new day once, with undo", () => {
    store().addTask(task);
    store().addTask({ ...task, name: "Done one" });
    store().updateTask(today().tasks[1].id, { done: true });
    store().syncToday(new Date(2026, 9, 1, 8));
    expect(today().tasks.map((t) => t.name)).toEqual(["Write"]);
    store().syncToday(new Date(2026, 9, 1, 9));
    expect(today().tasks).toHaveLength(1);
    store().undoCarryOver();
    expect(today().tasks).toHaveLength(0);
    expect(store().days["2026-09-30"].tasks[0].movedTo).toBeUndefined();
  });

  it("keeps every day", () => {
    for (let d = 1; d <= 10; d++) {
      store().syncToday(new Date(2026, 9, d, 9));
      store().addTask(task);
    }
    // 10 October days plus the 30 September day created in beforeEach.
    expect(Object.keys(store().days)).toHaveLength(11);
  });

  it("keeps a later day when the clock moves back", () => {
    store().syncToday(new Date(2026, 9, 1, 0, 30));
    store().addTask(task);
    store().syncToday(new Date(2026, 8, 30, 23, 30));
    expect(store().days["2026-10-01"]?.tasks).toHaveLength(1);
  });

  it("rejects day bounds off the 5-minute grid", () => {
    expect(store().setSettings({ start: 487, end: 1260 }).ok).toBe(false);
    expect(store().settings.start).toBe(480);
  });
});

describe("persistence", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("migrates a v1 save without losing days", () => {
    const day = { tasks: [], blocks: [], carryOverHandled: true };
    const v1 = { days: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [`2026-09-2${d}`, day])), settings: { start: 480, end: 1260 } };
    const v2 = migrate(v1, 1);
    expect(Object.keys(v2.days)).toHaveLength(7);
    expect(v2.days["2026-09-21"]).toEqual({ tasks: [], blocks: [], carryOverDone: true });
  });

  it("reports a full quota instead of throwing", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
    });
    expect(() => guardedStorage().setItem("timebox", "{}")).not.toThrow();
    expect(useStorageStatus.getState().full).toBe(true);
  });
});

