export const SLOT_MINUTES = 5;
export const DURATION_PRESETS = [5, 10, 15, 30, 60] as const;

export const snap = (minutes: number) =>
  Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES;

export const isSlotMultiple = (minutes: number) =>
  Number.isInteger(minutes) && minutes > 0 && minutes % SLOT_MINUTES === 0;

/** 545 → "09:05" */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "09:05" → 545, or null when malformed. */
export function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 24 || m > 59 || (h === 24 && m > 0)) return null;
  return h * 60 + m;
}

/** 95 → "1h 35m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** "2026-09-30" → "Wednesday, 30 September" in the user's locale. */
export function formatDateKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Local calendar date, e.g. "2026-09-30".
 * Not toISOString(): that is UTC and would file 00:30 in Rome under yesterday.
 */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
