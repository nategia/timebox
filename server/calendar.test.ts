import { afterEach, describe, expect, it, vi } from "vitest";
import { CalendarError, checkLinkShape, dayWindow, expandDay, fetchIcs, handleCalendarRequest, zonedToUtc } from "./calendar";

const ROME = "Europe/Rome";

const VTIMEZONE_ROME = `BEGIN:VTIMEZONE
TZID:Europe/Rome
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE`;

const ics = (...events: string[]) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//test//EN", VTIMEZONE_ROME, ...events, "END:VCALENDAR"].join("\r\n");

const vevent = (lines: string) => `BEGIN:VEVENT\nDTSTAMP:20260901T000000Z\n${lines.trim()}\nEND:VEVENT`;

const FIXTURE = ics(
  // Mon/Wed standup; Wed 23 Sep skipped.
  vevent(`UID:standup
SUMMARY:Standup
DTSTART;TZID=Europe/Rome:20260907T100000
DTEND;TZID=Europe/Rome:20260907T101500
RRULE:FREQ=WEEKLY;BYDAY=MO,WE
EXDATE;TZID=Europe/Rome:20260923T100000`),
  // Daily sync; today's instance moved to 14:00 and renamed.
  vevent(`UID:sync
SUMMARY:Sync
DTSTART;TZID=Europe/Rome:20260901T090000
DTEND;TZID=Europe/Rome:20260901T093000
RRULE:FREQ=DAILY`),
  vevent(`UID:sync
RECURRENCE-ID;TZID=Europe/Rome:20260930T090000
SUMMARY:Sync (moved)
DTSTART;TZID=Europe/Rome:20260930T140000
DTEND;TZID=Europe/Rome:20260930T143000`),
  // Daily lunch; today's instance cancelled.
  vevent(`UID:lunch
SUMMARY:Lunch
DTSTART;TZID=Europe/Rome:20260901T130000
DTEND;TZID=Europe/Rome:20260901T133000
RRULE:FREQ=DAILY`),
  vevent(`UID:lunch
RECURRENCE-ID;TZID=Europe/Rome:20260930T130000
SUMMARY:Lunch
STATUS:CANCELLED
DTSTART;TZID=Europe/Rome:20260930T130000
DTEND;TZID=Europe/Rome:20260930T133000`),
  vevent(`UID:holiday
SUMMARY:Holiday
DTSTART;VALUE=DATE:20260930
DTEND;VALUE=DATE:20261001`),
  vevent(`UID:late
SUMMARY:Late flight
DTSTART;TZID=Europe/Rome:20260929T230000
DTEND;TZID=Europe/Rome:20260930T010000`),
  vevent(`UID:utc
SUMMARY:UTC call
DTSTART:20260930T120000Z
DTEND:20260930T123000Z`),
  // TZID with no VTIMEZONE in the file: resolved via Intl.
  vevent(`UID:ny
SUMMARY:NY call
DTSTART;TZID=America/New_York:20260930T090000
DTEND;TZID=America/New_York:20260930T093000`),
  vevent(`UID:sunday
SUMMARY:Sunday run
DTSTART;TZID=Europe/Rome:20261018T100000
DTEND;TZID=Europe/Rome:20261018T110000
RRULE:FREQ=WEEKLY`),
  vevent(`UID:tomorrow
SUMMARY:Tomorrow only
DTSTART;TZID=Europe/Rome:20261001T100000
DTEND;TZID=Europe/Rome:20261001T110000`),
);

describe("zonedToUtc / dayWindow", () => {
  it("converts Rome wall time across DST", () => {
    expect(new Date(zonedToUtc(2026, 9, 30, 10, 0, 0, ROME)).toISOString()).toBe("2026-09-30T08:00:00.000Z");
    expect(new Date(zonedToUtc(2026, 10, 26, 10, 0, 0, ROME)).toISOString()).toBe("2026-10-26T09:00:00.000Z");
  });

  it("gives a 25-hour window on the day clocks go back", () => {
    const { from, to } = dayWindow("2026-10-25", ROME);
    expect((to - from) / 3_600_000).toBe(25);
  });
});

describe("expandDay", () => {
  const day = expandDay(FIXTURE, "2026-09-30", ROME);
  const byTitle = Object.fromEntries(day.events.map((e) => [e.title, e]));

  it("expands a weekly series and honours EXDATE", () => {
    expect(byTitle.Standup).toEqual({ title: "Standup", start: "2026-09-30T08:00:00.000Z", end: "2026-09-30T08:15:00.000Z" });
    expect(expandDay(FIXTURE, "2026-09-23", ROME).events.map((e) => e.title)).not.toContain("Standup");
  });

  it("uses the moved instance, not the original time", () => {
    expect(byTitle.Sync).toBeUndefined();
    expect(byTitle["Sync (moved)"].start).toBe("2026-09-30T12:00:00.000Z");
  });

  it("drops a cancelled instance but keeps other days", () => {
    expect(byTitle.Lunch).toBeUndefined();
    expect(expandDay(FIXTURE, "2026-09-29", ROME).events.map((e) => e.title)).toContain("Lunch");
  });

  it("returns all-day events as titles", () => {
    expect(day.allDay).toEqual(["Holiday"]);
    expect(expandDay(FIXTURE, "2026-10-01", ROME).allDay).toEqual([]);
  });

  it("includes an event that crosses midnight into today", () => {
    expect(byTitle["Late flight"].end).toBe("2026-09-29T23:00:00.000Z");
  });

  it("handles UTC times and a TZID without VTIMEZONE", () => {
    expect(byTitle["UTC call"].start).toBe("2026-09-30T12:00:00.000Z");
    expect(byTitle["NY call"].start).toBe("2026-09-30T13:00:00.000Z");
  });

  it("keeps local time across the DST change", () => {
    expect(expandDay(FIXTURE, "2026-10-18", ROME).events.find((e) => e.title === "Sunday run")?.start).toBe(
      "2026-10-18T08:00:00.000Z",
    );
    expect(expandDay(FIXTURE, "2026-10-25", ROME).events.find((e) => e.title === "Sunday run")?.start).toBe(
      "2026-10-25T09:00:00.000Z",
    );
  });

  it("leaves out other days' one-off events and sorts by start", () => {
    expect(byTitle["Tomorrow only"]).toBeUndefined();
    const starts = day.events.map((e) => e.start);
    expect(starts).toEqual([...starts].sort());
  });
});

describe("link and content checks", () => {
  it("accepts Google iCal and iCloud published links", () => {
    expect(checkLinkShape("https://calendar.google.com/calendar/ical/me%40gmail.com/private-abc123/basic.ics")).toBeNull();
    expect(checkLinkShape("webcal://p42-caldav.icloud.com/published/2/ABC")).toBeNull();
  });

  it("spots the Google Calendar page address", () => {
    expect(checkLinkShape("https://calendar.google.com/calendar/u/1?cid=abc")).toBe("calendar_page_link");
  });

  it("refuses other hosts and schemes", () => {
    expect(checkLinkShape("https://example.com/cal.ics")).toBe("not_a_calendar_link");
    expect(checkLinkShape("http://calendar.google.com/calendar/ical/x/public/basic.ics")).toBe("not_a_calendar_link");
    expect(checkLinkShape("not a url")).toBe("not_a_calendar_link");
  });

  it("refuses a sign-in page instead of crashing", () => {
    expect(() => expandDay("<!doctype html><html>Sign in</html>", "2026-09-30", ROME)).toThrow(CalendarError);
  });
});


describe("fetchIcs guards", () => {
  const GOOGLE = "https://calendar.google.com/calendar/ical/me%40gmail.com/private-abc/basic.ics";
  const ICLOUD = "https://p52-caldav.icloud.com/published/2/abc";

  afterEach(() => vi.unstubAllGlobals());

  const stubFetch = (...responses: Response[]) => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: URL) => {
      calls.push(String(url));
      return responses.shift() ?? new Response("", { status: 500 });
    });
    return calls;
  };

  it("follows a redirect between iCloud hosts", async () => {
    const calls = stubFetch(
      new Response(null, { status: 301, headers: { location: "https://p60-caldav.icloud.com/published/2/abc" } }),
      new Response(FIXTURE),
    );
    expect(await fetchIcs(ICLOUD)).toContain("BEGIN:VCALENDAR");
    expect(calls).toEqual([ICLOUD, "https://p60-caldav.icloud.com/published/2/abc"]);
  });

  it("refuses a redirect to another host (sign-in page, or anywhere else)", async () => {
    stubFetch(new Response(null, { status: 302, headers: { location: "https://accounts.google.com/signin" } }));
    await expect(fetchIcs(GOOGLE)).rejects.toMatchObject({ code: "not_a_calendar" });
  });

  it("never fetches a disallowed link at all", async () => {
    const calls = stubFetch(new Response(FIXTURE));
    await expect(fetchIcs("https://169.254.169.254/latest/meta-data")).rejects.toMatchObject({ code: "not_a_calendar_link" });
    expect(calls).toEqual([]);
  });

  it("gives up on responses over 5 MB", async () => {
    stubFetch(new Response("x".repeat(5 * 1024 * 1024 + 1)));
    await expect(fetchIcs(GOOGLE)).rejects.toMatchObject({ code: "too_large" });
  });

  it("stops after too many redirects", async () => {
    const hop = () => new Response(null, { status: 302, headers: { location: ICLOUD } });
    stubFetch(hop(), hop(), hop(), hop());
    await expect(fetchIcs(ICLOUD)).rejects.toMatchObject({ code: "unreachable" });
  });

  it("maps network failures and timeouts to unreachable", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new DOMException("timed out", "TimeoutError");
    });
    await expect(fetchIcs(GOOGLE)).rejects.toMatchObject({ code: "unreachable" });
  });
});

describe("handleCalendarRequest", () => {
  afterEach(() => vi.unstubAllGlobals());

  const post = (body: unknown, init: RequestInit = {}) =>
    handleCalendarRequest(
      new Request("http://localhost/api/calendar", { method: "POST", body: JSON.stringify(body), ...init }),
    );

  it("returns today's events", async () => {
    vi.stubGlobal("fetch", async () => new Response(FIXTURE));
    const res = await post({
      url: "https://calendar.google.com/calendar/ical/x/private-y/basic.ics",
      date: "2026-09-30",
      tz: ROME,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as { events: unknown[]; allDay: string[] };
    expect(body.allDay).toEqual(["Holiday"]);
    expect(body.events.length).toBeGreaterThan(0);
  });

  it("rejects bad bodies and methods", async () => {
    expect((await post({ url: "x", date: "30/09/2026", tz: ROME })).status).toBe(400);
    expect((await post({ url: "x", date: "2026-09-30", tz: "Mars/Olympus" })).status).toBe(400);
    expect((await handleCalendarRequest(new Request("http://localhost/api/calendar"))).status).toBe(405);
    expect((await post({ url: "x".repeat(5000), date: "2026-09-30", tz: ROME })).status).toBe(413);
  });

  it("returns a category, never upstream content", async () => {
    vi.stubGlobal("fetch", async () => new Response("<html>secret sign-in page</html>"));
    const res = await post({
      url: "https://calendar.google.com/calendar/ical/x/private-y/basic.ics",
      date: "2026-09-30",
      tz: ROME,
    });
    expect(res.status).toBe(422);
    expect(await res.text()).toBe('{"error":"not_a_calendar"}');
  });
});
