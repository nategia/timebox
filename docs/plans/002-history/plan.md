# Plan: Timebox history, auto carry-over and backup

**Spec:** [docs/specs/001-timebox/spec.md](../../specs/001-timebox/spec.md) (v2: FR-020, FR-020a/b/c, FR-023, FR-024)
**Spec change:** [diff.txt](./diff.txt) (v1 → v2; calendar and hosting parts go to plan 003)
**Status:** Approved (2026-09-30)

## Overview
Days are kept forever instead of 7. When a new day starts, yesterday's unfinished tasks move in automatically with an Undo notice, and the old day marks them "moved to [date]". ‹ › arrows by the date browse past days read-only. Export/import to a JSON file plus a persistent-storage request protect history, with a one-time Safari notice (idea-vet addendum). Browser only, no server, no new dependencies. One PR.

## Database Changes
None. Still one localStorage key `timebox` (Zustand `persist`).

### Modified shape (persist version 1 → 2)
```ts
type Task = { /* v1 fields */; movedTo?: string };          // "2026-10-01" on the source day after carry-over
type Day = {
  tasks: Task[];
  blocks: Block[];
  carriedIn?: { from: string; taskIds: string[] };        // what auto carry-over added today, for Undo
  carryOverDone: boolean;                                 // replaces carryOverHandled; carry runs once per day
};
type Saved = { days: Record<string, Day>; settings; theme; safariNoticeDismissed: boolean };
```

### Migration
`migrate(v1 → v2)`: rename `carryOverHandled` → `carryOverDone`; keep all days. Tested.

## API / Server Actions
None.

## File Structure
```
src/
  domain/
    carry-over.ts        — NEW pure: pick source day (latest earlier day with unfinished, not-moved tasks), build carried copies, undo
    carry-over.test.ts   — NEW
    backup.ts            — NEW pure: serialize all data, parse + validate an imported file (type guards, no `any`)
    backup.test.ts       — NEW
  store/
    day-store.ts         — no pruning; version 2 + migrate; auto carry in syncToday; undoCarryOver; importAll; viewDate (not persisted)
    day-store.test.ts    — migration, carry once per day, undo, import replace
  hooks/
    use-storage.ts       — NEW: navigator.storage.persist() once; Safari (not installed) detection for the notice
  components/
    DayNav.tsx           — NEW: ‹ date › + "Today"; no stepping past today
    CarryOver.tsx        — becomes the notice: "Carried 3 from Tue 29 Sep · Undo" (dismissible)
    DataPanel.tsx        — NEW: Export / Import (inline "Replace all your days?" confirm), Safari notice
    TaskList.tsx, Timeline.tsx, BlockItem.tsx — `readOnly` prop for past days; show done / "moved to …"
  App.tsx                — header uses DayNav; renders the viewed day
```
5 new source files (+2 tests), ~8 modified. No new dependencies.

## Key Technical Decisions
- **Carry-over is copy + mark, not move.** Today gets fresh copies (new ids, unplaced, not done); the source tasks stay and get `movedTo`, so the past day still tells the truth. Undo deletes the copies and clears `movedTo`. `carryOverDone` stops a reload from carrying twice (spec edge case).
- **Source day = most recent earlier day with unfinished, not-yet-moved tasks** (covers "didn't open the app for days"). Only one source day per carry; older days aren't swept, so skipped weeks don't dump everything into today.
- **Carry runs inside `syncToday`,** which already fires on load and tab focus (and the phase 3 ticker later). One place, no timers.
- **`viewDate` lives in the store but isn't persisted.** Reload always opens today. Components read `viewDate ?? today`; editing actions only ever write to `today`, so past days are read-only by construction, not just by hidden buttons.
- **No pruning.** Size check: ~2–5 KB per day → ~1–3 years before localStorage's ~5 MB. Every change re-serialises all days: at 1,000 days (~3 MB) that's a few ms per write, fine at human speed. A write that hits the quota shows "Storage is full, export a backup" instead of failing silently. Moving to IndexedDB is the escape hatch if it ever matters.
- **Backup is plain JSON** `{ app: "timebox", version: 2, exportedAt, data }`. Import validates shape with type guards, runs the same migration if `version` is older, and replaces everything only after an inline confirm. Download via `Blob` + `<a download>`, upload via `<input type="file">`. No server.
- **Persistence:** call `navigator.storage.persist()` once on load (Chrome/Edge/Firefox may grant silently). Safari notice shows when Safari and not running as an installed web app (`display-mode: standalone` / `navigator.standalone`), until dismissed.
- **No dialog library.** Confirm is inline in `DataPanel` to avoid another Radix dependency.
- **Dates:** day keys stay local `YYYY-MM-DD`; stepping uses local date parts (no UTC), same as `localDateKey`.

## Data Flow
- **New day:** load / tab focus → `syncToday` → `today` changes → `carry-over.pick(days, today)` → copies into today, `movedTo` on source, `carriedIn` + `carryOverDone` → `CarryOver` notice → Undo → `undoCarryOver`.
- **Browse:** DayNav ‹ › → `setViewDate(key)` → App renders `days[viewDate]` read-only → "Today" clears it.
- **Backup:** DataPanel Export → `backup.serialize(state)` → file. Import → `backup.parse(text)` → confirm → `importAll(data)` → `syncToday()`.

## Decisions (resolved 2026-09-30)
- Carried tasks arrive unplaced.
- The › arrow stops at today; no future days.
