# Tasks: Hosting on Vercel + calendar share links

**Plan:** [plan.md](./plan.md)
**Spec:** [docs/specs/001-timebox/spec.md](../../specs/001-timebox/spec.md) (FR-005, FR-012/a/b/c/d, FR-021, FR-022, FR-025, FR-026)

One PR (branch `feat/003-hosting-calendars`); tasks are commits, each leaves the app building.
Every task also needs: `npm run typecheck`, `npm run lint`, `npm test` pass.

## Progress

- [x] T001: Spike: fetch + expand your real calendars (partial pass; real-recurrence check moved to T004)
- [x] T002: `/api/calendar` function, guards, dev middleware
- [x] T003: Store v3 (`calendars`, `externalBlocks`) + backups
- [x] T003a: Automatic safety copy + restore, undo after delete (added 2026-09-30 after lost tasks)
- [ ] T004: Calendar settings, live events on the timeline → **moved to the next PR** (ship live first, 2026-09-30)
- [x] T005: Vercel config, headers, README, first deploy (deploy pending your Vercel import)

---

### T001: Spike: fetch + expand your real calendars (blocking)
- **Status:** `[~]`
- **Dependencies:** none
- **Acceptance Criteria:**
  - [x] `ical.js` added; `server/calendar.ts` has `expandDay(ics, from, to)` returning timed events (UTC instants) and all-day titles
  - [x] Script `scripts/spike-calendar.ts` reads links from gitignored `.local/calendars.json`, prints today's and tomorrow's events in local time (titles only on your screen, nothing written)
  - [~] Pass: real iCloud link fetched + parsed (p52, 4 KB, 15 ms), correct empty result; Google link was the Calendar page address (now detected with a clear message). Real repeating events not yet available → **re-check in T004** (decided 2026-09-30)
  - [x] Fixture tests (no real data): weekly RRULE, EXDATE, RECURRENCE-ID override, cancelled instance, all-day, event crossing midnight, TZID without VTIMEZONE, DST day in Europe/Rome

### T002: `/api/calendar` function, guards, dev middleware
- **Status:** `[x]`
- **Dependencies:** T001
- **Acceptance Criteria:**
  - [x] `validateLink`: `webcal`→`https`; only `calendar.google.com` and `pNN-caldav.icloud.com`; rejects others (`not_a_calendar_link`)
  - [x] `fetchIcs`: manual redirects (max 2, each re-validated), 8 s timeout, 5 MB streamed cap, GET only
  - [x] `api/calendar.ts` POST `{ url, date, tz }` (server computes the local day window), returns `{ events, allDay }` or `{ error }` categories; no logging of url/body/events
  - [x] Vite dev middleware serves the same handler at `/api/calendar`
  - [x] Tests: allowlist, redirect to disallowed host, oversize, timeout, bad body

### T003: Store v3 (`calendars`, `externalBlocks`) + backups
- **Status:** `[x]`
- **Dependencies:** none
- **Acceptance Criteria:**
  - [x] Persist v3 + `migrate` (v2 → `calendars: []`); v1 → v3 still works
  - [x] `addCalendar(name, url)` (client-side link check), `removeCalendar(id)`
  - [x] `externalBlocks` (not persisted); `commitBlock` validates against day blocks + external
  - [x] Backup accepts optional `calendars` (validated); export includes them; confirm text mentions private links
  - [x] Tests: migration, placing onto a meeting rejected, backup with/without calendars

### T003a: Automatic safety copy + restore
- **Status:** `[x]`
- **Dependencies:** T003 (added mid-plan: tasks in the dev tab went from 5 to 0; not reproducible, cause unknown)
- **Acceptance Criteria:**
  - [x] One safety copy (backup format) before the first save of each day and before any save dropping 3+ tasks/calendars
  - [x] Best-effort: skipped if storage is tight, never blocks the real save
  - [x] "Restore safety copy" in Your data, same validation and confirm as importing
  - [x] Test: once per day for small changes, fresh copy on a big drop
  - [x] Undo history of deletes (task, block, calendar; last 20, newest first; bar for 8 s after each change; ⌘Z / Ctrl+Z any time outside text fields); each undo restores just that item, in place; a task comes back unplaced if its slot was taken
  - [x] Restore confirm shows task counts (copy vs now) and refuses when the copy equals the current data
  - Lesson: the start-of-day copy doesn't catch one-at-a-time deletes; restoring it wiped Nathaniel's test tasks. Undo is the primary protection now.

### T004: Calendar settings, live events on the timeline
- **Status:** `[ ]`
- **Dependencies:** T002, T003
- **Acceptance Criteria:**
  - [ ] `CalendarSettings`: add (name + link), list with masked link, remove, per-calendar status, help text (Google "Secret address in iCal format", Apple "Public Calendar", Workspace note)
  - [ ] `use-calendars`: fetch on load, focus, every 5 min while visible; cache last good per calendar in `timebox-calendar-cache`; keep last good on error
  - [ ] Meetings render as fixed, non-draggable blocks (today only); all-day events as notes above the grid
  - [ ] Task blocks overlapping a meeting show "clashes with [meeting]"
  - [ ] Verified with your real links in the local app, **including a repeating event, a moved/cancelled instance and an all-day event** (carried over from T001)

### T005: Vercel config, headers, README, first deploy
- **Status:** `[x]` (moved ahead of T004 to go live sooner)
- **Dependencies:** T003
- **Acceptance Criteria:**
  - [x] `vercel.json`: CSP (theme script hash, guarded by a test), `no-referrer`, `nosniff`, Permissions-Policy, function `maxDuration` (no rewrite needed: single page, no routes)
  - [x] README: what Timebox is, run locally, deploy to Vercel, optional WAF rate-limit rule, privacy (data in your browser; links only pass through the function)
  - [x] Production build under the same headers locally (`npm run preview`): no CSP errors, theme script and Geist load
  - [ ] You import the repo on Vercel; deployed URL loads without CSP errors; `/api/calendar` answers
  - [x] STATUS.md and CLAUDE.md updated
