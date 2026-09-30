import { SLOT_MINUTES } from "./time";
import { type Block, type Day, type DayBounds, type Days, KINDS, type Task, type Theme, THEMES } from "./types";

export type BackupData = { days: Days; settings: DayBounds; theme: Theme };

type BackupFile = { app: "timebox"; version: number; exportedAt: string; data: BackupData };

export type ParsedBackup =
  | { ok: true; data: BackupData; exportedAt: string; dayCount: number }
  | { ok: false; reason: string };

export function serializeBackup(data: BackupData, version: number, now: Date): string {
  const file: BackupFile = { app: "timebox", version, exportedAt: now.toISOString(), data };
  return JSON.stringify(file, null, 2);
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function isTask(v: unknown): v is Task {
  return (
    isRecord(v) &&
    isString(v.id) &&
    isString(v.name) &&
    isNumber(v.minutes) &&
    KINDS.includes(v.kind as Task["kind"]) &&
    isBool(v.fixed) &&
    isBool(v.isBreak) &&
    isBool(v.done) &&
    (v.movedTo === undefined || (isString(v.movedTo) && DATE_KEY.test(v.movedTo)))
  );
}

function isBlock(v: unknown): v is Block {
  if (!isRecord(v) || !isString(v.id) || !isNumber(v.start) || !isNumber(v.minutes) || !isBool(v.fixed)) return false;
  if (v.source === "task") return isString(v.taskId);
  if (v.source === "event") return isString(v.title);
  return false;
}

/** Checks a v2 day. Older versions are migrated before this runs. */
function isDay(v: unknown): v is Day {
  return (
    isRecord(v) &&
    Array.isArray(v.tasks) &&
    v.tasks.every(isTask) &&
    Array.isArray(v.blocks) &&
    v.blocks.every(isBlock) &&
    isBool(v.carryOverDone)
  );
}

const isSettings = (v: unknown): v is DayBounds =>
  isRecord(v) &&
  isNumber(v.start) &&
  isNumber(v.end) &&
  v.start % SLOT_MINUTES === 0 &&
  v.end % SLOT_MINUTES === 0 &&
  v.end > v.start;

/**
 * Parses a backup file's text. Runs the same migration as saved data for older
 * versions, then validates every day so a bad file can never replace good data.
 */
export function parseBackup(
  text: string,
  currentVersion: number,
  migrate: (persisted: unknown, version: number) => unknown,
): ParsedBackup {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, reason: "That file isn't a Timebox backup (not valid JSON)." };
  }
  if (!isRecord(file) || file.app !== "timebox" || !isNumber(file.version) || !isRecord(file.data)) {
    return { ok: false, reason: "That file isn't a Timebox backup." };
  }
  if (file.version > currentVersion) {
    return { ok: false, reason: "This backup was made by a newer version of Timebox. Reload the app and try again." };
  }

  const data = migrate(file.data, file.version);
  if (!isRecord(data) || !isRecord(data.days) || !isSettings(data.settings)) {
    return { ok: false, reason: "The backup is damaged: settings or days are missing." };
  }
  const badKey = Object.entries(data.days).find(([key, day]) => !DATE_KEY.test(key) || !isDay(day));
  if (badKey) return { ok: false, reason: `The backup is damaged: day ${badKey[0]} can't be read.` };

  const theme = THEMES.includes(data.theme as Theme) ? (data.theme as Theme) : "system";
  return {
    ok: true,
    data: { days: data.days as Days, settings: data.settings, theme },
    exportedAt: isString(file.exportedAt) ? file.exportedAt : "",
    dayCount: Object.keys(data.days).length,
  };
}
