import { describe, expect, it } from "vitest";
import { formatDuration, formatTime, localDateKey, parseTime, snap } from "./time";

describe("time", () => {
  it("snaps to 5 minutes", () => {
    expect(snap(482)).toBe(480);
    expect(snap(483)).toBe(485);
  });

  it("formats and parses HH:MM", () => {
    expect(formatTime(545)).toBe("09:05");
    expect(parseTime("09:05")).toBe(545);
    expect(parseTime("9:05")).toBe(545);
    expect(parseTime("25:00")).toBeNull();
    expect(parseTime("nope")).toBeNull();
  });

  it("formats durations", () => {
    expect(formatDuration(35)).toBe("35m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(95)).toBe("1h 35m");
  });

  it("uses the local date, not UTC", () => {
    expect(localDateKey(new Date(2026, 8, 30, 0, 30))).toBe("2026-09-30");
  });
});
