# Plan: Hosting on Vercel + calendar share links

**Spec:** [docs/specs/001-timebox/spec.md](../../specs/001-timebox/spec.md) (v2: FR-005, FR-012/a/b/c/d, FR-021, FR-022, FR-025, FR-026 + calendar edge cases)
**Spec change:** none this round ([diff.txt](./diff.txt))
**Idea vet:** [addendum 2026-09-30](../../idea-vet.md) (spikes, SSRF, privacy)
**Status:** Approved (2026-09-30)

## Overview
Put Timebox on a public Vercel URL (Hobby, non-commercial) and let each visitor paste Google/iCloud calendar share links. One small serverless function fetches a link, expands today's events (recurring, exceptions, time zones, all-day) and returns them; nothing is stored or logged server-side. Events show as fixed, non-draggable blocks and count as obstacles when placing tasks. AI planning (FR-027/028) is **not** here: it moves to plan 004 with "Plan it for me". Starts with a spike on your real calendar links; if recurring events don't expand correctly, we stop and rethink.

## Database Changes
None. Browser only.

### Saved shape (persist version 2 → 3)
```ts
type Calendar = { id: string; name: string; url: string };   // url = user's secret link; never logged
type Saved = { /* v2 */; calendars: Calendar[] };             // migrate: calendars = []
```
Calendar events are **not** in the main blob: a separate key `timebox-calendar-cache` holds the last good fetch per calendar for today (`{ date, events, fetchedAt }`), so reloads offline still show meetings and the main blob isn't rewritten every 5 minutes.

Backups include `calendars` (they're your links, in your file); the import confirm says so.

## API

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/calendar` | POST | none (public, guarded) | Body `{ url, from, to }` (ISO instants of the local day). Returns `{ events: [{ title, start, end }], allDay: [{ title }] }` or `{ error }` with a user-safe reason |

**Guards (from the idea vet):**
- Link in the **body**, never the query string (stays out of access logs).
- `webcal://` → `https://`; only `https` to `calendar.google.com` or `pNN-caldav.icloud.com`. Redirects followed manually, max 2, each target re-checked against the allowlist (iCloud redirects between `pNN` hosts).
- GET only upstream, 8 s timeout, 5 MB response cap (streamed, aborted past the cap), `text/calendar` expected.
- No `console.log` of url, body or events. Errors return a category (`not_a_calendar_link`, `unreachable`, `too_large`, `not_a_calendar`), never upstream content.
- `from`/`to` must be ≤ 48 h apart (limits expansion work).

## File Structure
```
api/
  calendar.ts            — NEW: Vercel function; `export async function POST(request)`; thin wrapper
server/
  calendar.ts            — NEW: validateLink, fetchIcs (allowlist, redirects, timeout, size cap), expandDay (ical.js)
  calendar.test.ts       — NEW: allowlist/redirect/size rules + expansion fixtures (weekly RRULE, EXDATE, moved instance, all-day, DST, Europe/Rome VTIMEZONE)
src/
  store/day-store.ts     — v3 + migrate; `calendars` + add/remove; `externalBlocks` (not persisted) used by commitBlock validation
  hooks/use-calendars.ts — NEW: fetch on load + every 5 min + on focus; cache; per-calendar error state; converts events → fixed blocks in local minutes
  components/
    CalendarSettings.tsx — NEW: add (name + link), list (name + masked link), remove, per-calendar status; help text incl. Workspace note
    Timeline.tsx         — render calendar blocks (read-only, "fixed" colour), all-day notes above the grid, overlap warning on clashing task blocks
  domain/backup.ts       — accept optional `calendars`
vite.config.ts           — dev-only middleware mounting server/calendar.ts at /api/calendar, so `npm run dev` stays one command
vercel.json              — NEW: SPA rewrite, security headers (CSP, no-referrer, nosniff), function maxDuration 10
```
5 new source files (+1 test). New dependency: `ical.js` (server only, 0 deps, MPL-2.0).

## Key Technical Decisions
- **Server expands, client places.** The function returns UTC instants for events overlapping the requested local day; the browser converts to local minutes. The server needs no time-zone logic of its own beyond what the .ics VTIMEZONE provides; the browser's zone decides "today".
- **ical.js** over hand-parsing or `node-ical`: no dependencies, iterates RRULE with EXDATE and RECURRENCE-ID exceptions, reads VTIMEZONE. Server-only, so the client bundle doesn't grow.
- **Calendar blocks are derived, not stored.** They live in `externalBlocks` (memory) and the cache key, never in `days[…].blocks`, so a removed meeting disappears on the next refresh and history stays your plan, not a copy of your calendar. Past days show no meetings (today only, per spec).
- **Validation includes meetings.** `commitBlock` validates against `[...day.blocks, ...externalBlocks]`, so you can't drop a task onto a meeting. If a new meeting overlaps an already-placed task, the task gets a "clashes with [meeting]" marker (spec edge case); re-flow comes with phase 3.
- **Manual meetings stay.** "Add meeting" remains for people without a link.
- **One dev command.** A tiny Vite `configureServer` middleware imports `server/calendar.ts` for `/api/calendar` in dev; Vercel serves `api/calendar.ts` in production. Same code path.
- **Headers.** CSP `default-src 'self'; connect-src 'self'; script-src 'self' 'sha256-…'` (hash of the no-flash theme script), `img-src 'self' data:`, `style-src 'self' 'unsafe-inline'` (Tailwind/Radix inline styles), `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`. Calendar text is only ever rendered as React text.
- **Deploy.** Connect the GitHub repo to a Vercel Hobby project (you do this once in the dashboard); every merge to `main` deploys. Preview deploys per PR. Optional: one WAF rate-limit rule on `/api/calendar` (dashboard, documented in README).
- **Refresh.** On load, on tab focus, and every 5 min while visible. Failures keep the last good events and show a quiet per-calendar note.

## Data Flow
Settings → add link → store `calendars` (validated client-side too) → `use-calendars` → `POST /api/calendar { url, from, to }` → function validates, fetches, expands → `{ events, allDay }` → hook converts to fixed blocks → `externalBlocks` + cache → Timeline renders; `commitBlock` treats them as obstacles.

## Tasks (preview, for /tasks-create)
1. **Spike** (blocking): `server/calendar.ts` fetch + expand, run against your real Google and iCloud links locally; pass = recurring, moved and all-day events match your Calendar app in local time.
2. Function + guards + tests; Vite dev middleware.
3. Store v3 (`calendars`, `externalBlocks`), backup support.
4. Settings UI + `use-calendars` + timeline rendering, all-day notes, clash marker.
5. `vercel.json` (headers, rewrite), README deploy notes, first deploy with you.

## Decisions (resolved 2026-09-30)
- Spike uses Nathaniel's real share links, pasted locally (gitignored `.local/calendars.json` for the spike script), never committed or logged.
- Deploy: Nathaniel imports the repo in the Vercel dashboard; merges to `main` deploy, PRs get previews.
- Backups include calendar links (the import confirm and export note say the file holds private links).
