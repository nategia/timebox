import { describe, expect, it } from "vitest";
import { carryOver, findSource, undoCarryOver } from "./carry-over";
import type { Day, Days, Task } from "./types";

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  name: id,
  minutes: 30,
  kind: "deep",
  fixed: false,
  isBreak: false,
  done: false,
  ...extra,
});

const day = (tasks: Task[], extra: Partial<Day> = {}): Day => ({
  tasks,
  blocks: [],
  carryOverDone: true,
  ...extra,
});

let n = 0;
const newId = () => `new-${++n}`;

describe("carry-over", () => {
  it("copies unfinished tasks into today and marks the originals moved", () => {
    const days: Days = { "2026-09-29": day([task("a"), task("b", { done: true })]) };
    const out = carryOver(days, "2026-09-30", newId);
    expect(out["2026-09-30"].tasks.map((t) => t.name)).toEqual(["a"]);
    expect(out["2026-09-30"].tasks[0].id).not.toBe("a");
    expect(out["2026-09-30"].carriedIn?.from).toBe("2026-09-29");
    expect(out["2026-09-29"].tasks.find((t) => t.id === "a")?.movedTo).toBe("2026-09-30");
    expect(out["2026-09-29"].tasks.find((t) => t.id === "b")?.movedTo).toBeUndefined();
  });

  it("runs once per day", () => {
    const days: Days = { "2026-09-29": day([task("a")]) };
    const once = carryOver(days, "2026-09-30", newId);
    expect(carryOver(once, "2026-09-30", newId)).toBe(once);
  });

  it("skips days back to the latest one with open tasks", () => {
    const days: Days = {
      "2026-09-25": day([task("old")]),
      "2026-09-26": day([task("fri")]),
      "2026-09-28": day([task("done", { done: true })]),
    };
    expect(findSource(days, "2026-09-30")).toBe("2026-09-26");
    const out = carryOver(days, "2026-09-30", newId);
    expect(out["2026-09-30"].tasks.map((t) => t.name)).toEqual(["fri"]);
    expect(out["2026-09-25"].tasks[0].movedTo).toBeUndefined();
  });

  it("marks today done when there's nothing to carry", () => {
    const out = carryOver({}, "2026-09-30", newId);
    expect(out["2026-09-30"]).toEqual({ tasks: [], blocks: [], carryOverDone: true });
  });

  it("keeps tasks already added today after the carried ones", () => {
    const days: Days = {
      "2026-09-29": day([task("a")]),
      "2026-09-30": day([task("mine")], { carryOverDone: false }),
    };
    const out = carryOver(days, "2026-09-30", newId);
    expect(out["2026-09-30"].tasks.map((t) => t.name)).toEqual(["a", "mine"]);
  });

  it("undo removes the copies, restores the source, and doesn't re-carry", () => {
    const days: Days = { "2026-09-29": day([task("a")]), "2026-09-30": day([task("mine")], { carryOverDone: false }) };
    const carried = carryOver(days, "2026-09-30", newId);
    const undone = undoCarryOver(carried, "2026-09-30");
    expect(undone["2026-09-30"].tasks.map((t) => t.name)).toEqual(["mine"]);
    expect(undone["2026-09-30"].carriedIn).toBeUndefined();
    expect(undone["2026-09-29"].tasks[0].movedTo).toBeUndefined();
    expect(carryOver(undone, "2026-09-30", newId)).toBe(undone);
  });
});
