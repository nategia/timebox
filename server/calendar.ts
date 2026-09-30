import ICAL from "ical.js";

export type CalendarEvent = { title: string; start: string; end: string };

/** User-safe failure categories; never carries upstream content. */
export type CalendarErrorCode =
  | "not_a_calendar_link"
  | "calendar_page_link"
  | "not_a_calendar"
  | "unreachable"
  | "too_large"
  | "bad_request";

export class CalendarError extends Error {
  constructor(readonly code: CalendarErrorCode) {
    super(code);
  }
}

const GOOGLE_HOST = "calendar.google.com";
const ICLOUD_HOST = /^p\d+-caldav\.icloud\.com$/;

/** Only these hosts are ever fetched, including after redirects (keeps the function from being an open proxy). */
const isAllowedHost = (url: URL) =>
  url.protocol === "https:" && (url.hostname === GOOGLE_HOST || ICLOUD_HOST.test(url.hostname));

/**
 * Recognises the one mistake almost everyone makes first: copying the Google Calendar page's
 * address (calendar.google.com/calendar/u/1?…) instead of the iCal link (…/calendar/ical/…/basic.ics).
 */
export function checkLinkShape(raw: string): CalendarErrorCode | null {
  let url: URL;
  try {
    url = new URL(raw.trim().replace(/^webcal:/i, "https:"));
  } catch {
    return "not_a_calendar_link";
  }
  if (url.protocol !== "https:") return "not_a_calendar_link";
  if (url.hostname === GOOGLE_HOST) {
    return /^\/calendar\/ical\/[^/]+\/(private-[^/]+|public)\/basic\.ics$/.test(url.pathname) ? null : "calendar_page_link";
  }
  if (ICLOUD_HOST.test(url.hostname)) return url.pathname.startsWith("/published/") ? null : "not_a_calendar_link";
  return "not_a_calendar_link";
}
export type CalendarDay = { events: CalendarEvent[]; allDay: string[] };

/** Stops a pathological RRULE (e.g. every minute since 1970) from spinning the function. */
const MAX_OCCURRENCES = 20_000;

const isValidTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/** Offset of `tz` from UTC at `utcMs`, in ms (e.g. +2h for Rome in summer). */
function tzOffsetMs(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - utcMs;
}

/** Wall-clock time in `tz` → UTC ms. Two passes handle DST changes between guess and answer. */
export function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const first = guess - tzOffsetMs(guess, tz);
  const second = guess - tzOffsetMs(first, tz);
  return second;
}

/** Local midnight → next local midnight for `date` ("2026-09-30") in `tz`, as UTC ms. */
export function dayWindow(date: string, tz: string): { from: number; to: number } {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return {
    from: zonedToUtc(y, m, d, 0, 0, 0, tz),
    to: zonedToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0, 0, tz),
  };
}

/**
 * ICAL.Time → UTC ms. Times with a known zone (UTC or a VTIMEZONE in the file) convert
 * directly. A TZID the file doesn't define ("Europe/Rome" without VTIMEZONE) is resolved
 * with Intl; floating times use the visitor's zone.
 */
function toUtcMs(time: ICAL.Time, tzid: string | null, visitorTz: string): number {
  if (time.zone !== ICAL.Timezone.localTimezone) return time.toUnixTime() * 1000;
  const zone = tzid && isValidTimeZone(tzid) ? tzid : visitorTz;
  return zonedToUtc(time.year, time.month, time.day, time.hour, time.minute, time.second, zone);
}

const dateKey = (t: ICAL.Time) =>
  `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;

const isCancelled = (c: ICAL.Component) => String(c.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED";

/**
 * Today's events from an .ics file, for `date` in the visitor's time zone.
 * Handles RRULE/RDATE/EXDATE, moved or cancelled single instances (RECURRENCE-ID),
 * all-day events (returned as titles), and events that cross midnight.
 */
export function expandDay(ics: string, date: string, visitorTz: string): CalendarDay {
  // A sign-in page or error page parses badly (and ical.js throws on HTML), so check first.
  if (!/^\s*BEGIN:VCALENDAR/.test(ics)) throw new CalendarError("not_a_calendar");
  let parsed: ReturnType<typeof ICAL.parse>;
  try {
    parsed = ICAL.parse(ics);
  } catch {
    throw new CalendarError("not_a_calendar");
  }
  const root = new ICAL.Component(parsed);
  const { from, to } = dayWindow(date, visitorTz);
  const vevents = root.getAllSubcomponents("vevent");

  // Group overrides (RECURRENCE-ID) under their series by UID.
  const overrides = new Map<string, ICAL.Component[]>();
  const masters: ICAL.Component[] = [];
  for (const v of vevents) {
    if (v.hasProperty("recurrence-id")) {
      const uid = String(v.getFirstPropertyValue("uid"));
      overrides.set(uid, [...(overrides.get(uid) ?? []), v]);
    } else {
      masters.push(v);
    }
  }
  const masterUids = new Set(masters.map((m) => String(m.getFirstPropertyValue("uid"))));
  // An override whose series isn't in the file (Google sometimes exports these) is a one-off event.
  for (const [uid, list] of overrides) if (!masterUids.has(uid)) masters.push(...list);

  const events: CalendarEvent[] = [];
  const allDay: string[] = [];

  const add = (component: ICAL.Component, start: ICAL.Time, end: ICAL.Time, title: string) => {
    if (isCancelled(component)) return;
    if (start.isDate) {
      // All-day: DTEND is exclusive, so a one-day event on the 30th ends on the 1st.
      if (dateKey(start) <= date && date < dateKey(end)) allDay.push(title);
      return;
    }
    const tzid = component.getFirstProperty("dtstart")?.getParameter("tzid") ?? null;
    const startMs = toUtcMs(start, typeof tzid === "string" ? tzid : null, visitorTz);
    const endMs = toUtcMs(end, typeof tzid === "string" ? tzid : null, visitorTz);
    if (startMs < to && endMs > from) {
      events.push({ title, start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString() });
    }
  };

  for (const master of masters) {
    const event = new ICAL.Event(master);
    const title = event.summary || "Busy";
    if (!event.isRecurring() || event.isRecurrenceException()) {
      add(master, event.startDate, event.endDate ?? event.startDate, title);
      continue;
    }
    for (const override of overrides.get(event.uid) ?? []) event.relateException(override);

    const it = event.iterator();
    for (let i = 0, next = it.next(); next && i < MAX_OCCURRENCES; i++, next = it.next()) {
      const details = event.getOccurrenceDetails(next);
      const tzid = master.getFirstProperty("dtstart")?.getParameter("tzid");
      const startMs = details.startDate.isDate
        ? Date.UTC(details.startDate.year, details.startDate.month - 1, details.startDate.day)
        : toUtcMs(details.startDate, typeof tzid === "string" ? tzid : null, visitorTz);
      // Occurrences come in start order; one day past the window is safely beyond it.
      if (startMs >= to + 86_400_000) break;
      add(details.item.component, details.startDate, details.endDate, details.item.summary || title);
    }
  }

  events.sort((a, b) => a.start.localeCompare(b.start));
  return { events, allDay };
}

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 2;
const TIMEOUT_MS = 8_000;

/** Reads a body, giving up past MAX_BYTES instead of buffering an unbounded response. */
async function readCapped(res: Response): Promise<string> {
  const declared = Number(res.headers.get("content-length"));
  if (declared > MAX_BYTES) throw new CalendarError("too_large");
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new CalendarError("too_large");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/**
 * Fetches a calendar share link. Redirects are followed by hand so every hop is
 * re-checked against the allowlist (iCloud hops between pNN hosts; a Google link to a
 * private calendar redirects to accounts.google.com, which we treat as "not a calendar").
 */
export async function fetchIcs(link: string): Promise<string> {
  const shape = checkLinkShape(link);
  if (shape) throw new CalendarError(shape);
  let url = new URL(link.trim().replace(/^webcal:/i, "https:"));

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        redirect: "manual",
        headers: { accept: "text/calendar" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new CalendarError("unreachable");
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new CalendarError("unreachable");
      const next = new URL(location, url);
      if (!isAllowedHost(next)) throw new CalendarError("not_a_calendar");
      url = next;
      continue;
    }
    if (!res.ok) throw new CalendarError("unreachable");
    return readCapped(res);
  }
  throw new CalendarError("unreachable");
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BODY_BYTES = 4096;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

/**
 * POST { url, date, tz } → { events, allDay } | { error }.
 * The link is only ever read from the body (never the query string, so it stays out of
 * access logs), and nothing here logs the link, the body or the events (FR-022).
 */
export async function handleCalendarRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "bad_request" }, 405);
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return json({ error: "bad_request" }, 413);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json({ error: "bad_request" }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const { url, date, tz } = (body ?? {}) as Record<string, unknown>;
  if (typeof url !== "string" || url.length > 2048 || typeof date !== "string" || !DATE_KEY.test(date)) {
    return json({ error: "bad_request" }, 400);
  }
  if (typeof tz !== "string" || !isValidTimeZone(tz)) return json({ error: "bad_request" }, 400);

  try {
    const ics = await fetchIcs(url);
    return json(expandDay(ics, date, tz));
  } catch (e) {
    const code: CalendarErrorCode = e instanceof CalendarError ? e.code : "not_a_calendar";
    return json({ error: code }, code === "unreachable" ? 502 : 422);
  }
}

