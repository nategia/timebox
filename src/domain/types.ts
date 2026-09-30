/** Colour group of a block. Calendar/meeting blocks use the "fixed" colour regardless. */
export type Kind = "deep" | "body" | "light";

export const KINDS: readonly Kind[] = ["deep", "body", "light"];

export const KIND_LABEL: Record<Kind, string> = {
  deep: "Deep work",
  body: "Body / outside",
  light: "Light / rest",
};

export type Task = {
  id: string;
  name: string;
  /** Multiple of 5. */
  minutes: number;
  kind: Kind;
  /** Re-flow and Claude must never move a fixed task's block. */
  fixed: boolean;
  /** Breaks are flexible and shrinkable by re-flow. */
  isBreak: boolean;
  done: boolean;
  /** Set on the source day when auto carry-over copied this task into a later day. */
  movedTo?: string;
};

/** A placed slot on today's timeline. Times are minutes since local midnight. */
export type Block = {
  id: string;
  start: number;
  minutes: number;
  fixed: boolean;
} & (
  | { source: "task"; taskId: string }
  /** Meeting added by hand (plan 002: from Google Calendar). Never draggable. */
  | { source: "event"; title: string }
);

export type DayBounds = { start: number; end: number };

/** "system" follows the OS appearance. */
export type Theme = "system" | "light" | "dark";

export const THEMES: readonly Theme[] = ["system", "light", "dark"];

export type Day = {
  tasks: Task[];
  blocks: Block[];
  /** Carry-over already ran (or was undone) for this day, so a reload never carries twice. */
  carryOverDone: boolean;
  /** What auto carry-over added to this day, for the notice and Undo. */
  carriedIn?: { from: string; taskIds: string[] };
};

/** A calendar share link the visitor added. `url` is a secret: never logged, shown masked. */
export type Calendar = { id: string; name: string; url: string };

/** Saved days keyed by local date, e.g. "2026-09-30". */
export type Days = Record<string, Day>;
