# Tasks: Timebox v1

**Plan:** [plan.md](./plan.md)
**Spec:** [docs/specs/001-timebox/spec.md](../../specs/001-timebox/spec.md)

One PR per phase (plan: 3 PRs). Tasks are commits inside the phase branch; each leaves the app building.
Every task also needs: `npm run typecheck`, `npm run lint`, `npm test` (from T001 on) pass.

## Progress

**Phase 1: clean slate + manual day** (branch `feat/001-timebox-phase-1`)
- [ ] T001: Clean slate
- [ ] T002: Design tokens
- [ ] T003: Domain core (types, time, validate) + tests
- [ ] T004: Day store + persistence
- [ ] T005: Task list
- [ ] T006: Timeline (place, move, resize, remove)
- [ ] T007: Day settings + carry-over

**Phase 2: Plan it for me** (branch `feat/001-timebox-phase-2`)
- [ ] T008: Local API plugin + setup
- [ ] T009: `/api/plan` (Claude)
- [ ] T010: Plan bar (preview, accept, undo, unplaced)

**Phase 3: live day** (branch `feat/001-timebox-phase-3`)
- [ ] T011: Re-flow + tests
- [ ] T012: Live day (now marker, countdown, catch-up)
- [ ] T013: Block end (notifications, +time, done early, re-plan)
- [ ] T014: Browser check + start usage test

---

## Phase 1

### T001: Clean slate
- **Status:** `[ ]`
- **Dependencies:** none
- **Acceptance Criteria:**
  - [ ] 2024 app deleted: `src/routes/`, `routeTree.gen.ts`, old `src/components/*`, `use-toast.ts`, `App.css`, `components.json`
  - [ ] Deps removed: react-beautiful-dnd, TanStack Router/Query (+ router plugin, eslint plugin), Radix, react-icons, ramda, class-variance-authority, tailwindcss-animate, their `@types`
  - [ ] Kept: zustand, lucide-react, clsx, tailwind-merge
  - [ ] `bun.lockb` deleted; `package-lock.json` regenerated with npm
  - [ ] `vitest` added (dev) with `npm test` script
  - [ ] `App.tsx` renders an empty shell; `npm run build` passes

### T002: Design tokens
- **Status:** `[ ]`
- **Dependencies:** T001
- **Acceptance Criteria:**
  - [ ] `src/styles/tokens.css` holds all colours, fonts, spacing, radii, light + dark
  - [ ] Kind colours: deep work, body/outside, light/rest, plus fixed; calm, flat, Claude-like
  - [ ] `tailwind.config.js` maps utilities to the CSS variables
  - [ ] No hex values anywhere in `src/components/`

### T003: Domain core + tests
- **Status:** `[ ]`
- **Dependencies:** T001
- **Acceptance Criteria:**
  - [ ] `domain/types.ts`: Task (name, minutes, fixed, kind, priority, done), Block (taskId, start, minutes, kind, fixed, source task|calendar|break)
  - [ ] `domain/time.ts`: minutes ↔ HH:MM, snap to 5 min, slot maths; no React, no Date.now inside pure functions
  - [ ] `domain/validate.ts`: overlap, day bounds, fixed-block-moved checks, returns a short reason
  - [ ] Vitest covers: overlap, touching edges allowed, out of bounds, snapping, fixed moved

### T004: Day store + persistence
- **Status:** `[ ]`
- **Dependencies:** T003
- **Acceptance Criteria:**
  - [ ] `store/day-store.ts` (Zustand + persist): tasks, blocks, settings; one localStorage key per date + a settings key
  - [ ] All block writes go through `validate`; invalid returns the reason and changes nothing
  - [ ] Reload and browser restart keep today's state (FR-020)

### T005: Task list
- **Status:** `[ ]`
- **Dependencies:** T002, T004
- **Acceptance Criteria:**
  - [ ] Add task: name + 5/10/15/30/60 or custom multiple of 5 (FR-001)
  - [ ] Fixed/flexible toggle and kind picker; breaks default to flexible (FR-002)
  - [ ] Edit, reorder by priority, delete (FR-003)
  - [ ] Empty state invites adding tasks

### T006: Timeline
- **Status:** `[ ]`
- **Dependencies:** T005
- **Acceptance Criteria:**
  - [ ] Vertical timeline, 5-min steps, day start → end (FR-004)
  - [ ] Pointer drag task → free slot; move; bottom-edge resize; remove (FR-006)
  - [ ] Pick-then-click fallback (keyboard reachable)
  - [ ] Invalid drop: inline message, snaps back (FR-007)
  - [ ] Meetings added by hand as fixed blocks, not draggable (stand-in for FR-005 until plan 002)
  - [ ] Colour by kind, legend, total planned time (FR-008)

### T007: Day settings + carry-over
- **Status:** `[ ]`
- **Dependencies:** T006
- **Acceptance Criteria:**
  - [ ] Day start/end configurable, default 08:00–21:00
  - [ ] New day starts empty; if yesterday has unfinished tasks, prompt to carry them over (FR-020)
  - [ ] Old day keys don't pile up forever (keep last 7)

---

## Phase 2

### T008: Local API plugin + setup
- **Status:** `[ ]`
- **Dependencies:** Phase 1 merged
- **Acceptance Criteria:**
  - [ ] Load `claude-api` skill first
  - [ ] `server/api-plugin.ts` mounts `/api/*` in the Vite dev server; binds 127.0.0.1; rejects non-local Origin/Host
  - [ ] JSON errors; logs only route, status, duration, token counts (FR-022)
  - [ ] `.env.example` (Claude key, model default `claude-sonnet-5`); `.env` gitignored
  - [ ] `SetupBanner` when the key is missing; manual planning still works

### T009: `/api/plan`
- **Status:** `[ ]`
- **Dependencies:** T008
- **Acceptance Criteria:**
  - [ ] `server/plan.ts`: tasks + fixed blocks + bounds + now → Claude Messages API via `fetch`, structured JSON output
  - [ ] Response validated with `domain/validate`; invalid → "Couldn't make a valid plan. Try again."
  - [ ] Returns blocks, unplaced tasks with notes, one-line reason (FR-009, FR-011)
  - [ ] Tests for parse + reject paths (Claude mocked)

### T010: Plan bar
- **Status:** `[ ]`
- **Dependencies:** T009
- **Acceptance Criteria:**
  - [ ] `use-plan` + `PlanBar`: "Plan it for me" → preview on timeline, reason line, accept / undo (undo snapshot in store) (FR-009, FR-010)
  - [ ] Unplaced tasks listed with note (FR-011)
  - [ ] Loading and error states; failure leaves the day untouched

---

## Phase 3

### T011: Re-flow + tests
- **Status:** `[ ]`
- **Dependencies:** Phase 2 merged
- **Acceptance Criteria:**
  - [ ] `domain/reflow.ts`: +N min → shrink breaks → push flexible later → never move fixed (FR-017)
  - [ ] Past day end → unplaced, named in reason (FR-018)
  - [ ] Returns a one-line reason, e.g. "Shortened 15:00 break by 10 min, moved Read to 17:30"
  - [ ] Output always passes `validate`; tests for each rule

### T012: Live day
- **Status:** `[ ]`
- **Dependencies:** T011
- **Acceptance Criteria:**
  - [ ] `use-live-day`: 1 s ticker, current/next block, block-end detection
  - [ ] `NowMarker` moves; current block highlighted with countdown (FR-015)
  - [ ] `visibilitychange` catch-up: missed block end → "add time" or "move on"

### T013: Block end
- **Status:** `[ ]`
- **Dependencies:** T012
- **Acceptance Criteria:**
  - [ ] `use-notifications` + `public/sw.js`: "[Block] done. Next: [next]" with +5/+10/+30 where supported (FR-016)
  - [ ] `BlockEndBanner` in-app fallback, also when notifications are blocked
  - [ ] +time applies `reflow` and shows the reason
  - [ ] Done early: next block starts now or keeps its time (FR-019)
  - [ ] "Re-plan with Claude" button reuses `/api/plan`

### T014: Browser check + usage test
- **Status:** `[ ]`
- **Dependencies:** T013
- **Acceptance Criteria:**
  - [ ] Verified whether notifications + SW work in the Claude Code browser pane; Chrome fallback documented
  - [ ] STATUS.md: usage test start date and kill lines (6/10 workdays, 5+ re-plans, 70%+ accepted)
