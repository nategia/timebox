/**
 * T001 spike: fetch your real calendar links and print today's + tomorrow's events in local time.
 * Links live in .local/calendars.json (gitignored): [{ "name": "Work", "url": "https://…" }]
 * Run: npm run spike:calendar
 * Prints to your terminal only; nothing is written or sent anywhere else.
 */
import { readFileSync } from "node:fs";
import { CalendarError, checkLinkShape, expandDay } from "../server/calendar";
import { LINK_HINT } from "../src/domain/calendar-link";

type Link = { name: string; url: string };

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const links = JSON.parse(readFileSync(".local/calendars.json", "utf8")) as Link[];
const local = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: tz });
const keyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const today = new Date();
const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

const HINT = LINK_HINT;

for (const link of links) {
  if (link.url.startsWith("PASTE_")) {
    console.log(`\n== ${link.name}: skipped (placeholder)`);
    continue;
  }
  const shapeError = checkLinkShape(link.url);
  if (shapeError) {
    console.log(`\n== ${link.name}: ${HINT[shapeError]}`);
    continue;
  }
  const url = link.url.replace(/^webcal:/i, "https:");
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  console.log(`\n== ${link.name}: HTTP ${res.status}, ${Math.round(text.length / 1024)} KB, host ${new URL(res.url).host}`);
  // Only count inside VEVENTs: VTIMEZONE blocks carry their own RRULEs.
  const events = text.split(/^BEGIN:VEVENT/m).slice(1).map((e) => e.split(/^END:VEVENT/m)[0]).join("\n");
  const count = (re: RegExp) => (re.source === "^BEGIN:VEVENT" ? text : events).match(re)?.length ?? 0;
  console.log(
    `  file holds ${count(/^BEGIN:VEVENT/gm)} events: ${count(/^RRULE:/gm)} repeating, ` +
      `${count(/^RECURRENCE-ID/gm)} moved/cancelled instances, ${count(/^DTSTART;VALUE=DATE:/gm)} all-day`,
  );
  for (const date of [keyOf(today), keyOf(tomorrow)]) {
    const t0 = performance.now();
    let day;
    try {
      day = expandDay(text, date, tz);
    } catch (e) {
      console.log(`    ${e instanceof CalendarError ? HINT[e.code] : "Couldn't read this calendar."}`);
      break;
    }
    console.log(`\n  ${date} (${Math.round(performance.now() - t0)} ms, zone ${tz})`);
    for (const title of day.allDay) console.log(`    all day   ${title}`);
    for (const e of day.events) console.log(`    ${local(e.start)}–${local(e.end)}  ${e.title}`);
    if (!day.events.length && !day.allDay.length) console.log("    (nothing)");
  }
}
