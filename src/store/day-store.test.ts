import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SNAPSHOT_KEY, guardedStorage, migrate, useDayStore, useStorageStatus } from "./day-store";

const task = { name: "Write", minutes: 30, kind: "deep", fixed: false, isBreak: false } as const;

const store = () => useDayStore.getState();
const today = () => store().days[store().today];

beforeEach(() => {
  useDayStore.setState({ days: {}, settings: { start: 480, end: 1260 }, viewDate: null, calendars: [], externalBlocks: [], undoStack: [] });
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

  it("browsing a past day never edits it", () => {
    store().addTask(task);
    store().syncToday(new Date(2026, 9, 1, 9));
    store().setViewDate("2026-09-30");
    expect(store().viewDate).toBe("2026-09-30");
    store().addTask({ ...task, name: "New" });
    expect(store().days["2026-10-01"].tasks.map((t) => t.name)).toContain("New");
    expect(store().days["2026-09-30"].tasks.map((t) => t.name)).not.toContain("New");
    store().setViewDate("2026-10-01");
    expect(store().viewDate).toBeNull();
  });

  it("import replaces everything and returns to today", () => {
    store().addTask(task);
    store().setViewDate("2026-09-20");
    store().importAll({
      days: { "2026-09-01": { tasks: [], blocks: [], carryOverDone: true } },
      settings: { start: 540, end: 1080 },
      theme: "light",
    });
    expect(Object.keys(store().days).sort()).toEqual(["2026-09-01", "2026-09-30"]);
    expect(today().tasks).toHaveLength(0);
    expect(store().settings.start).toBe(540);
    expect(store().viewDate).toBeNull();
  });

  it("syncToday doesn't write when nothing changed", () => {
    let writes = 0;
    const unsubscribe = useDayStore.subscribe(() => writes++);
    store().syncToday(new Date(2026, 8, 30, 15));
    unsubscribe();
    expect(writes).toBe(0);
  });

  it("adds calendars only with a real share link, once", () => {
    expect(store().addCalendar("Work", "https://calendar.google.com/calendar/u/1?cid=x")).toEqual({
      ok: false,
      problem: "calendar_page_link",
    });
    const link = "webcal://p52-caldav.icloud.com/published/2/abc";
    expect(store().addCalendar("Home", link).ok).toBe(true);
    expect(store().addCalendar("Again", link)).toEqual({ ok: false, problem: "duplicate" });
    const [cal] = store().calendars;
    store().removeCalendar(cal.id);
    expect(store().calendars).toEqual([]);
  });

  it("won't place a task on top of a meeting from a calendar", () => {
    store().setExternalBlocks([{ id: "m", source: "event", title: "Standup", start: 600, minutes: 30, fixed: true }]);
    store().addTask(task);
    expect(store().placeTask(today().tasks[0].id, 600)).toEqual({ ok: false, reason: "Overlaps another block" });
    expect(store().placeTask(today().tasks[0].id, 630).ok).toBe(true);
    expect(today().blocks).toHaveLength(1);
  });

  it("import clears the undo history", () => {
    store().addTask(task);
    store().deleteTask(today().tasks[0].id);
    store().importAll({ days: {}, settings: { start: 480, end: 1260 }, theme: "dark" });
    expect(store().undoStack).toEqual([]);
  });

  it("an older backup without calendars keeps the ones already added", () => {
    store().addCalendar("Home", "https://p52-caldav.icloud.com/published/2/abc");
    store().importAll({ days: {}, settings: { start: 480, end: 1260 }, theme: "dark" });
    expect(store().calendars).toHaveLength(1);
  });

  it("undo brings back a deleted task, in place, with its block", () => {
    store().addTask(task);
    store().addTask({ ...task, name: "Second" });
    const [first] = today().tasks;
    store().placeTask(first.id, 540);
    store().deleteTask(first.id);
    expect(store().undoStack.at(-1)).toMatchObject({ kind: "task", label: "Write" });
    store().undoDelete();
    expect(today().tasks.map((t) => t.name)).toEqual(["Write", "Second"]);
    expect(today().blocks[0]).toMatchObject({ taskId: first.id, start: 540 });
    expect(store().undoStack).toEqual([]);
  });

  it("undo steps back through several deletes, newest first", () => {
    for (const name of ["A", "B", "C", "D"]) store().addTask({ ...task, name });
    for (let i = 0; i < 3; i++) store().deleteTask(today().tasks[0].id);
    expect(today().tasks.map((t) => t.name)).toEqual(["D"]);
    store().undoDelete();
    expect(today().tasks.map((t) => t.name)).toEqual(["C", "D"]);
    store().undoDelete();
    store().undoDelete();
    expect(today().tasks.map((t) => t.name)).toEqual(["A", "B", "C", "D"]);
    expect(store().undoStack).toEqual([]);
  });

  it("undo returns a task unplaced if its slot was taken meanwhile", () => {
    store().addTask(task);
    store().addTask({ ...task, name: "Other" });
    const [a, b] = today().tasks;
    store().placeTask(a.id, 540);
    store().deleteTask(a.id);
    store().placeTask(b.id, 540);
    store().undoDelete();
    expect(today().tasks.map((t) => t.name)).toContain("Write");
    expect(today().blocks.map((x) => (x.source === "task" ? x.taskId : null))).toEqual([b.id]);
  });

  it("undo restores a removed block and a removed calendar", () => {
    store().addTask(task);
    store().placeTask(today().tasks[0].id, 600);
    store().removeBlock(today().blocks[0].id);
    store().undoDelete();
    expect(today().blocks).toHaveLength(1);

    store().addCalendar("Home", "https://p52-caldav.icloud.com/published/2/abc");
    store().removeCalendar(store().calendars[0].id);
    expect(store().calendars).toHaveLength(0);
    store().undoDelete();
    expect(store().calendars.map((c) => c.name)).toEqual(["Home"]);
  });

  it("an undo from yesterday does nothing after midnight", () => {
    store().addTask(task);
    store().deleteTask(today().tasks[0].id);
    store().syncToday(new Date(2026, 9, 1, 0, 5));
    store().undoDelete();
    expect(store().days["2026-09-30"].tasks).toHaveLength(0);
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
    const v3 = migrate(v1, 1);
    expect(Object.keys(v3.days)).toHaveLength(7);
    expect(v3.days["2026-09-21"]).toEqual({ tasks: [], blocks: [], carryOverDone: true });
    expect(v3.calendars).toEqual([]);
  });

  it("migrates a v2 save by adding an empty calendar list", () => {
    const v2 = { days: { "2026-09-30": { tasks: [], blocks: [], carryOverDone: true } }, settings: { start: 480, end: 1260 }, theme: "dark" };
    const v3 = migrate(v2, 2);
    expect(v3.calendars).toEqual([]);
    expect(v3.days).toEqual(v2.days);
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

  it("keeps a safety copy before a save that drops several tasks", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      removeItem: (k: string) => store.delete(k),
      setItem: (k: string, v: string) => store.set(k, v),
    });
    const blob = (names: string[]) =>
      JSON.stringify({ state: { days: { "2026-09-30": { tasks: names.map((name) => ({ name })) } } }, version: 3 });
    const storage = guardedStorage();
    storage.setItem("timebox", blob(["a", "b", "c", "d", "e"]));
    expect(store.has(SNAPSHOT_KEY)).toBe(false);
    storage.setItem("timebox", blob(["a", "b", "c", "d", "e", "f"]));
    const firstCopy = store.get(SNAPSHOT_KEY);
    expect(firstCopy).toContain('"app":"timebox"');
    storage.setItem("timebox", blob(["a", "b", "c", "d", "e", "f", "g"]));
    expect(store.get(SNAPSHOT_KEY)).toBe(firstCopy); // once per day for small changes
    storage.setItem("timebox", blob([]));
    expect(countTasks(store.get(SNAPSHOT_KEY)!)).toBe(7); // big drop → copy of the 7-task save
  });
});

describe("storage limits", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("drops the safety copy rather than failing the real save", () => {
    const store = new Map<string, string>();
    const LIMIT = 100; // total characters across keys
    const used = () => [...store.values()].reduce((n, v) => n + v.length, 0);
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      removeItem: (k: string) => store.delete(k),
      setItem: (k: string, v: string) => {
        if (used() - (store.get(k)?.length ?? 0) + v.length > LIMIT) throw new DOMException("full", "QuotaExceededError");
        store.set(k, v);
      },
    });
    useStorageStatus.setState({ full: false });
    const storage = guardedStorage();
    storage.setItem("timebox", JSON.stringify({ state: { a: "x".repeat(20) }, version: 3 }));
    storage.setItem("timebox", JSON.stringify({ state: { a: "y".repeat(40) }, version: 3 }));
    expect(JSON.parse(store.get("timebox")!).state.a).toBe("y".repeat(40));
    expect(useStorageStatus.getState().full).toBe(false);
  });
});

const countTasks = (backup: string) =>
  (JSON.parse(backup).data.days["2026-09-30"].tasks as unknown[]).length;
