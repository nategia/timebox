/**
 * T001 spike: fetch your real calendar links and print today's + tomorrow's events in local time.
 * Links live in .local/calendars.json (gitignored): [{ "name": "Work", "url": "https://…" }]
 * Run: npm run spike:calendar
 * Prints to your terminal only; nothing is written or sent anywhere else.
 */
import { readFileSync } from "node:fs";
import { expandDay } from "../server/calendar";

type Link = { name: string; url: string };

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const links = JSON.parse(readFileSync(".local/calendars.json", "utf8")) as Link[];
const local = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: tz });
const keyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const today = new Date();
const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

for (const link of links) {
  const url = link.url.replace(/^webcal:/i, "https:");
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  console.log(`\n== ${link.name}: HTTP ${res.status}, ${Math.round(text.length / 1024)} KB, host ${new URL(res.url).host}`);
  for (const date of [keyOf(today), keyOf(tomorrow)]) {
    const t0 = performance.now();
    const day = expandDay(text, date, tz);
    console.log(`\n  ${date} (${Math.round(performance.now() - t0)} ms, zone ${tz})`);
    for (const title of day.allDay) console.log(`    all day   ${title}`);
    for (const e of day.events) console.log(`    ${local(e.start)}–${local(e.end)}  ${e.title}`);
    if (!day.events.length && !day.allDay.length) console.log("    (nothing)");
  }
}
