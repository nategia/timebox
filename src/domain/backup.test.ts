import { describe, expect, it } from "vitest";
import { migrate } from "@/store/day-store";
import { type BackupData, parseBackup, serializeBackup } from "./backup";

const data: BackupData = {
  settings: { start: 480, end: 1260 },
  theme: "dark",
  days: {
    "2026-09-30": {
      tasks: [{ id: "a", name: "Write", minutes: 30, kind: "deep", fixed: false, isBreak: false, done: true }],
      blocks: [{ id: "b", source: "task", taskId: "a", start: 540, minutes: 30, fixed: false }],
      carryOverDone: true,
    },
  },
};

const parse = (text: string) => parseBackup(text, 2, migrate);

describe("backup", () => {
  it("round-trips", () => {
    const result = parse(serializeBackup(data, 2, new Date("2026-09-30T10:00:00Z")));
    expect(result).toEqual({ ok: true, data, exportedAt: "2026-09-30T10:00:00.000Z", dayCount: 1 });
  });

  it("rejects malformed JSON", () => {
    expect(parse("{nope")).toMatchObject({ ok: false });
  });

  it("rejects other apps' files", () => {
    expect(parse(JSON.stringify({ app: "other", version: 1, data: {} }))).toMatchObject({ ok: false });
  });

  it("rejects files from a newer version", () => {
    expect(parse(serializeBackup(data, 3, new Date()))).toMatchObject({ ok: false });
  });

  it("rejects a damaged day instead of importing it", () => {
    const bad = { ...data, days: { "2026-09-30": { tasks: [{ id: 1 }], blocks: [], carryOverDone: true } } };
    const result = parse(serializeBackup(bad as unknown as BackupData, 2, new Date()));
    expect(result).toEqual({ ok: false, reason: "The backup is damaged: day 2026-09-30 can't be read." });
  });

  it("migrates a v1 backup", () => {
    const v1 = {
      ...data,
      days: { "2026-09-29": { tasks: [], blocks: [], carryOverHandled: true } },
    };
    const result = parse(JSON.stringify({ app: "timebox", version: 1, exportedAt: "x", data: v1 }));
    expect(result.ok && result.data.days["2026-09-29"].carryOverDone).toBe(true);
  });
});
