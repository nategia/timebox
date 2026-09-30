# Plan: Timebox v1

**Spec:** [docs/specs/001-timebox/spec.md](../../specs/001-timebox/spec.md)
**Status:** Approved

## Overview
Fresh single-page app in the existing Vite + React + TS + Tailwind setup. The old 2024 todo code is deleted. A small Vite plugin serves `/api/*` inside the dev server, so one `npm run dev` runs everything and keys stay server-side. Claude is used only for "Plan it for me"; the "+time" re-flow is deterministic code, so it's instant, free and works offline. This plan covers phases 1–3: the usable app, which is also the 10-workday usage test. Google Calendar sync and open-source polish move to a later plan (002) once it's in daily use; until then meetings are added by hand as fixed blocks.

## Database Changes
None. No database.
- Day state (tasks, blocks, settings): browser `localStorage` via Zustand `persist`, one key per date plus a settings key.
- (Plan 002) Google tokens: `.timebox/google-token.json` on disk (gitignored), read and written only by the local server.

## API (local, inside Vite dev server)
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/plan` | POST | local only | Tasks + fixed blocks + day bounds + now → Claude → validated blocks + one-line reason |
| *(plan 002)* `/api/google/auth` | GET | local only | Redirect to Google consent (scope: calendar.events, calendar.readonly) |
| *(plan 002)* `/api/google/callback` | GET | local only | Exchange code, save token file, redirect home |
| *(plan 002)* `/api/google/status` | GET | local only | Connected / expired / not configured |
| *(plan 002)* `/api/calendar/today` | GET | local only | Today's primary-calendar events (id, title, start, end, createdByTimebox) |
| *(plan 002)* `/api/calendar/sync` | POST | local only | Apply create/update/delete ops for Timebox-created events only |

"Local only": the server binds to `127.0.0.1`; requests with a non-local `Origin`/`Host` are rejected.

## File Structure
```
server/
  api-plugin.ts        — Vite plugin: mounts /api routes, localhost guard, JSON errors
  plan.ts              — builds the Claude request, parses and validates the response
  google.ts            — (002) OAuth (plain fetch), token refresh, Calendar list + sync
  token-store.ts       — (002) read/write .timebox/google-token.json
src/
  main.tsx, App.tsx    — single page (TanStack Router removed)
  styles/tokens.css    — the only place for colours, fonts, spacing, radii (light + dark)
  domain/              — pure functions, no React
    time.ts            — 5-minute slot maths, formatting
    types.ts           — Task, Block (kind, fixed/flexible, source: task|calendar|break)
    validate.ts        — overlap / bounds / fixed-block checks (used for drops AND for Claude output)
    reflow.ts          — +N minutes: shrink breaks → push flexible → never move fixed → unplaced; returns reason string
    calendar-diff.ts   — (002) plan vs Timebox-created events → create/update/delete ops
  store/
    day-store.ts       — Zustand + persist: tasks, blocks, undo stack, settings, carry-over
  hooks/
    use-plan.ts        — calls /api/plan, preview/accept/undo, error states
    use-calendar.ts    — (002) status, today's events as fixed blocks, sync with confirm counts
    use-live-day.ts    — 1 s ticker, current/next block, block-end detection, catch-up after sleep
    use-notifications.ts — permission, service-worker notification with +5/+10/+30, in-app fallback
  components/
    TaskList.tsx, TaskForm.tsx
    Timeline.tsx, BlockItem.tsx, NowMarker.tsx   — pointer-based drag/resize on 5-min grid
    PlanBar.tsx         — Plan it for me, reason line, accept/undo
    BlockEndBanner.tsx  — in-app +5/+10/+30 and done-early
    SendDialog.tsx      — (002) "3 new, 1 changed, 0 removed" confirm
    SetupBanner.tsx     — missing Claude key (Google states in 002)
public/
  sw.js                — notificationclick → posts action (+5/+10/+30) back to the page
.env.example (Claude key now; README + LICENSE in 002)
```

## Key Technical Decisions
- **Keep Vite/React/TS/Tailwind, delete the rest of the 2024 app.** Remove `react-beautiful-dnd` (deprecated), TanStack Router and Query (single page, two fetch hooks), Radix, `react-icons`, `ramda`, the unused shadcn components. Keep `zustand`, `lucide-react`, `clsx`, `tailwind-merge`. npm (decided): delete `bun.lockb`. Net: dependencies go down.
- **New dependency: `vitest` (dev only).** `reflow.ts` and `validate.ts` are the heart of the app and pure; a few unit tests are cheaper than debugging a broken day on the timeline. Only new dependency.
- **No SDKs.** Claude Messages API and Google OAuth/Calendar via plain `fetch` on the server. Fewer deps, easier for open-source readers. Claude call uses structured JSON output against a schema; model `claude-sonnet-5` (spec decision), overridable in `.env`.
- **Claude plans, code re-flows (decided 2026-09-30).** Plus a "Re-plan with Claude" button for when the day really changed (keeps idea-vet test 5 meaningful). "Plan it for me" needs judgement (priority, energy, breaks). "+10 min" needs speed and must never break rules, so it's deterministic, with a generated reason like "Shortened 15:00 break by 10 min, moved Read to 17:30". Both outputs go through `validate.ts`.
- **Drag without a library.** Pointer events on a fixed 5-minute grid (move + bottom-edge resize) plus pick-then-click as a fallback. Avoids adding `dnd-kit`.
- **Notifications from the open tab.** A service worker is registered only to show notifications with action buttons (Chrome/Edge/Firefox) and route clicks back. No push server. Background tabs are throttled to ~1 timer/min, so block-end can fire up to a minute late; `visibilitychange` catches up after sleep. Safari: plain notification, buttons in-app.
- **Calendar ownership.** Timebox-created events carry a private extended property `timebox=1` plus the block id, so sync only ever touches its own events (FR-013).
- **Tokens (styling):** `tokens.css` defines CSS variables; `tailwind.config.js` maps utilities to them. No hex values in components.
- **Privacy:** server logs only route, status, duration and token counts. Never task names, event titles or model output (FR-022).

## Data Flow
- **Manual:** TaskForm → `day-store` → Timeline drag → `validate` → store → persisted.
- **Plan it for me:** `use-plan` → `POST /api/plan` (tasks, fixed blocks, bounds, now) → Claude → server validates → preview in store (undo snapshot kept) → accept or undo.
- **Live day:** `use-live-day` tick → block ends → `use-notifications` (SW notification or banner) → action → `reflow(+N)` → store update + reason toast.
- **Calendar (002):** `use-calendar` loads today → fixed blocks merged in → Send → `calendar-diff` → SendDialog counts → `POST /api/calendar/sync` → events updated.

## Phases (this plan)
1. **Clean slate + manual day:** delete old app and deps, tokens, store, tasks, timeline with drag/resize, fixed blocks entered by hand, persistence, carry-over prompt. Vitest + `validate` tests.
2. **Plan it for me:** load `claude-api` skill first; Vite API plugin, localhost guard, `/api/plan`, preview/accept/undo, unplaced list, errors.
3. **Live day:** ticker, now marker, block-end detection, SW notifications, `reflow` + tests, done-early. Check: do notifications + service worker work in the Claude Code browser pane? (Chrome is the fallback.) → start the 10-workday test.

**Later, plan 002:** Google Calendar (OAuth, today's events as fixed, diff + confirm + sync; verify 7-day testing-mode expiry and whether "In production" unverified avoids it for one user) and open-source polish (README, MIT, secret scan).

## Complexity budget
This plan: ≈17 new files, ≈15 deleted (old app). Still over the 5-new-files line, because it's a fresh app; split into 3 PRs, each through the full pre-merge flow. Dependencies go down (+1 dev dep `vitest`, about −10 runtime deps).

## Estimate
Honest: 3 PRs with full review ≈ 3–4 working sessions, not 1–2 days. Plan 002 another 2.

## Decisions (resolved 2026-09-30)
- +time re-flow = deterministic code; "Re-plan with Claude" button for bigger changes.
- Package manager = npm; delete `bun.lockb`.
- Delete the 2024 code outright (git history keeps it).
- Calendar sync + open-source polish move to plan 002; meetings added by hand until then.
