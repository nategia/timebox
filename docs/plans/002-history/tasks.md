# Tasks: Timebox history, auto carry-over and backup

**Plan:** [plan.md](./plan.md)
**Spec:** [docs/specs/001-timebox/spec.md](../../specs/001-timebox/spec.md) (FR-020, FR-020a/b/c, FR-023, FR-024)

One PR (branch `feat/002-history`); tasks are commits, each leaves the app building.
Every task also needs: `npm run typecheck`, `npm run lint`, `npm test` pass.

## Progress

- [x] T001: Store v2 (keep forever, migration)
- [x] T002: Auto carry-over + Undo
- [x] T002a: Priority ranks + drag to reorder (added 2026-09-30, your request)
- [x] T003: Browse past days (read-only)
- [x] T004: Backup export/import
- [ ] T005: Persistent storage + Safari notice

---

### T001: Store v2 (keep forever, migration)
- **Status:** `[x]`
- **Dependencies:** none
- **Acceptance Criteria:**
  - [x] `pruneDays` / `DAYS_KEPT` removed; no day is ever deleted automatically
  - [x] `Day.carryOverHandled` → `carryOverDone`; `Task.movedTo?`, `Day.carriedIn?` added
  - [x] Persist `version: 2` with `migrate` from v1; test: a v1 save with 7 days loads intact
  - [x] A write that exceeds storage quota shows "Storage is full, export a backup" (no silent failure)

### T002: Auto carry-over + Undo
- **Status:** `[x]`
- **Dependencies:** T001
- **Acceptance Criteria:**
  - [x] `domain/carry-over.ts` pure: source = latest earlier day with unfinished, not-moved tasks; copies get new ids, unplaced, not done; source tasks get `movedTo`
  - [x] Runs in `syncToday` once per day (`carryOverDone`); reload doesn't carry twice
  - [x] Notice "Carried N from [day] · Undo", dismissible; Undo removes copies and clears `movedTo`, and doesn't re-carry
  - [x] Old tick-to-carry prompt removed
  - [x] Tests: skipped days, nothing unfinished, undo, run twice

### T002a: Priority ranks + drag to reorder
- **Status:** `[x]`
- **Dependencies:** none (added mid-plan at Nathaniel's request; FR-003 "reorder by priority")
- **Acceptance Criteria:**
  - [x] Each task shows its rank; #1 filled, #2–3 outlined, rest quiet
  - [x] "Priority · top is most important · drag to reorder" header above the list
  - [x] Drag a row within the list to reorder, with a drop line; dragging onto the timeline still places it
  - [x] Arrows stay for keyboard users, dimmed instead of hidden
  - [x] `dropIndex` tested

### T003: Browse past days (read-only)
- **Status:** `[x]`
- **Dependencies:** T002
- **Acceptance Criteria:**
  - [x] `DayNav`: ‹ date › in the header, "Today" link when not on today; › disabled on today
  - [x] `viewDate` in store, not persisted; reload opens today
  - [x] Past day: timeline and tasks shown, no add/edit/drag/remove; done tasks ticked, carried ones "moved to [day]"
  - [x] Empty past day: "Nothing saved for this day"
  - [x] Store editing actions only write to today (test)

### T004: Backup export/import
- **Status:** `[x]`
- **Dependencies:** T001
- **Acceptance Criteria:**
  - [x] `domain/backup.ts`: serialize `{ app, version, exportedAt, data }`; parse validates with type guards, migrates older versions, rejects other files with a reason
  - [x] Export downloads `timebox-backup-YYYY-MM-DD.json`
  - [x] Import asks inline "Replace all your days?" before replacing; cancel changes nothing
  - [x] Tests: round-trip, wrong app, malformed JSON, v1 file

### T005: Persistent storage + Safari notice
- **Status:** `[ ]`
- **Dependencies:** T004
- **Acceptance Criteria:**
  - [ ] `navigator.storage.persist()` requested once on load where supported
  - [ ] Safari not installed as a web app: one-time notice (add to Dock/Home Screen, export a backup), dismiss saved
  - [ ] Not shown on Chrome/Edge/Firefox or when running installed
  - [ ] STATUS.md and CLAUDE.md updated (days kept forever, backup)
