import { describe, expect, it } from "vitest";
import type { Block } from "./types";
import { validateBlock, validatePlan } from "./validate";

const bounds = { start: 8 * 60, end: 21 * 60 };

const block = (id: string, start: number, minutes: number, fixed = false): Block => ({
  id,
  start,
  minutes,
  fixed,
  source: "task",
  taskId: id,
});

describe("validateBlock", () => {
  const meeting = block("m", 600, 60, true);

  it("accepts a free slot", () => {
    expect(validateBlock(block("a", 480, 30), [meeting], bounds).ok).toBe(true);
  });

  it("allows touching edges", () => {
    expect(validateBlock(block("a", 570, 30), [meeting], bounds).ok).toBe(true);
    expect(validateBlock(block("a", 660, 30), [meeting], bounds).ok).toBe(true);
  });

  it("rejects overlap", () => {
    expect(validateBlock(block("a", 590, 30), [meeting], bounds)).toEqual({
      ok: false,
      reason: "Overlaps another block",
    });
  });

  it("ignores itself when moved", () => {
    expect(validateBlock(block("m", 610, 60, true), [meeting], bounds).ok).toBe(true);
  });

  it("rejects out of bounds", () => {
    expect(validateBlock(block("a", 470, 30), [], bounds).ok).toBe(false);
    expect(validateBlock(block("a", 1250, 30), [], bounds).ok).toBe(false);
  });

  it("rejects off-grid times", () => {
    expect(validateBlock(block("a", 482, 30), [], bounds).ok).toBe(false);
    expect(validateBlock(block("a", 480, 7), [], bounds).ok).toBe(false);
    expect(validateBlock(block("a", 480, 0), [], bounds).ok).toBe(false);
  });
});

describe("validatePlan", () => {
  const before = [block("m", 600, 60, true), block("a", 480, 30)];

  it("accepts moved flexible blocks", () => {
    const after = [block("m", 600, 60, true), block("a", 700, 30)];
    expect(validatePlan(before, after, bounds).ok).toBe(true);
  });

  it("rejects a moved fixed block", () => {
    const after = [block("m", 615, 60, true), block("a", 480, 30)];
    expect(validatePlan(before, after, bounds)).toEqual({
      ok: false,
      reason: "A fixed block was moved",
    });
  });

  it("rejects a dropped fixed block", () => {
    expect(validatePlan(before, [block("a", 480, 30)], bounds).ok).toBe(false);
  });

  it("rejects overlap inside the new plan", () => {
    const after = [block("m", 600, 60, true), block("a", 630, 30)];
    expect(validatePlan(before, after, bounds).ok).toBe(false);
  });
});
