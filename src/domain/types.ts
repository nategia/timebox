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
