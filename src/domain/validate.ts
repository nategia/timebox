import { SLOT_MINUTES, isSlotMultiple } from "./time";
import type { Block, DayBounds } from "./types";

export type Validation = { ok: true } | { ok: false; reason: string };

const OK: Validation = { ok: true };

const end = (b: Block) => b.start + b.minutes;

/** Touching edges (one ends at 10:00, next starts at 10:00) is not an overlap. */
export const overlaps = (a: Block, b: Block) =>
  a.start < end(b) && b.start < end(a);

/** Checks one block against the rest of the day, e.g. on drop or resize. */
export function validateBlock(
  block: Block,
  others: readonly Block[],
  bounds: DayBounds,
): Validation {
  if (!isSlotMultiple(block.minutes) || block.start % SLOT_MINUTES !== 0) {
    return { ok: false, reason: "Blocks use 5-minute steps" };
  }
  if (block.start < bounds.start || end(block) > bounds.end) {
    return { ok: false, reason: "Outside the day" };
  }
  const clash = others.find((o) => o.id !== block.id && overlaps(o, block));
  if (clash) return { ok: false, reason: "Overlaps another block" };
  return OK;
}

/**
 * Checks a whole new plan against the previous one. Used for Claude output
 * and re-flow: every block valid, and fixed blocks exactly where they were.
 */
export function validatePlan(
  before: readonly Block[],
  after: readonly Block[],
  bounds: DayBounds,
): Validation {
  for (const block of after) {
    const result = validateBlock(block, after, bounds);
    if (!result.ok) return result;
  }
  for (const fixed of before.filter((b) => b.fixed)) {
    const same = after.find((b) => b.id === fixed.id);
    if (!same || same.start !== fixed.start || same.minutes !== fixed.minutes) {
      return { ok: false, reason: "A fixed block was moved" };
    }
  }
  return OK;
}
