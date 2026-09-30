# Tasks: Hosting on Vercel + calendar share links

**Plan:** [plan.md](./plan.md)
**Spec:** [docs/specs/001-timebox/spec.md](../../specs/001-timebox/spec.md) (FR-005, FR-012/a/b/c/d, FR-021, FR-022, FR-025, FR-026)

One PR (branch `feat/003-hosting-calendars`); tasks are commits, each leaves the app building.
Every task also needs: `npm run typecheck`, `npm run lint`, `npm test` pass.

## Progress

- [x] T001: Spike: fetch + expand your real calendars (partial pass; real-recurrence check moved to T004)
- [x] T002: `/api/calendar` function, guards, dev middleware
- [ ] T003: Store v3 (`calendars`, `externalBlocks`) + backups
- [ ] T004: Calendar settings, live events on the timeline
- [ ] T005: Vercel config, headers, README, first deploy

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
- **Status:** `[ ]`
- **Dependencies:** none
- **Acceptance Criteria:**
  - [ ] Persist v3 + `migrate` (v2 → `calendars: []`); v1 → v3 still works
  - [ ] `addCalendar(name, url)` (client-side link check), `removeCalendar(id)`
  - [ ] `externalBlocks` (not persisted); `commitBlock` validates against day blocks + external
  - [ ] Backup accepts optional `calendars` (validated); export includes them; confirm text mentions private links
  - [ ] Tests: migration, placing onto a meeting rejected, backup with/without calendars

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
- **Status:** `[ ]`
- **Dependencies:** T004
- **Acceptance Criteria:**
  - [ ] `vercel.json`: SPA rewrite, CSP (theme script hash), `no-referrer`, `nosniff`, function `maxDuration`
  - [ ] README: what Timebox is, run locally, deploy to Vercel, optional WAF rate-limit rule, privacy (data in your browser; links only pass through the function)
  - [ ] You import the repo on Vercel; preview deploy works: app loads, CSP has no console errors, calendar fetch works on the deployed URL
  - [ ] STATUS.md and CLAUDE.md updated
