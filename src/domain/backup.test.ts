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

const parse = (text: string) => parseBackup(text, 3, migrate);

describe("backup", () => {
  it("round-trips", () => {
    const result = parse(serializeBackup(data, 3, new Date("2026-09-30T10:00:00Z")));
    expect(result).toEqual({ ok: true, data, exportedAt: "2026-09-30T10:00:00.000Z", dayCount: 1 });
  });

  it("rejects malformed JSON", () => {
    expect(parse("{nope")).toMatchObject({ ok: false });
  });

  it("rejects other apps' files", () => {
    expect(parse(JSON.stringify({ app: "other", version: 1, data: {} }))).toMatchObject({ ok: false });
  });

  it("rejects files from a newer version", () => {
    expect(parse(serializeBackup(data, 4, new Date()))).toMatchObject({ ok: false });
  });

  it("rejects a damaged day instead of importing it", () => {
    const bad = { ...data, days: { "2026-09-30": { tasks: [{ id: 1 }], blocks: [], carryOverDone: true } } };
    const result = parse(serializeBackup(bad as unknown as BackupData, 3, new Date()));
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

  it("rejects a malformed carry-over record", () => {
    const bad = { ...data, days: { "2026-09-30": { ...data.days["2026-09-30"], carriedIn: {} } } };
    expect(parse(serializeBackup(bad as unknown as BackupData, 3, new Date()))).toMatchObject({ ok: false });
  });

  it("rejects blocks off the 5-minute grid or outside the day", () => {
    const block = data.days["2026-09-30"].blocks[0];
    for (const broken of [{ start: -30 }, { start: 542 }, { minutes: 0 }, { start: 1430, minutes: 30 }]) {
      const bad = { ...data, days: { "2026-09-30": { ...data.days["2026-09-30"], blocks: [{ ...block, ...broken }] } } };
      expect(parse(serializeBackup(bad as BackupData, 3, new Date()))).toMatchObject({ ok: false });
    }
  });

  it("carries calendar links and refuses a bad one", () => {
    const calendars = [{ id: "c", name: "Home", url: "webcal://p52-caldav.icloud.com/published/2/abc" }];
    const ok = parse(serializeBackup({ ...data, calendars }, 3, new Date()));
    expect(ok.ok && ok.data.calendars).toEqual(calendars);
    const bad = [{ id: "c", name: "Evil", url: "https://169.254.169.254/x" }];
    expect(parse(serializeBackup({ ...data, calendars: bad }, 3, new Date()))).toMatchObject({ ok: false });
  });
});
