# Spec: Timebox (personal AI timeboxer)

## Status
Approved (v1). v2 changes below (history, auto carry-over, share-link calendars, hosted with owner-only AI): Draft, awaiting approval.

## Overview
A calm, browser-based planner for one person's day. You list tasks, Claude fits them into the free gaps around your calendar, and the plan goes onto Google Calendar. During the day it runs a live countdown and, when a block ends, lets you add time; the rest of the day re-flows around fixed meetings with a one-line reason. It's a free web app anyone can open from a shareable link; everyone's data stays in their own browser, and AI planning is private to the owner (v2). It also serves as the 10-workday usage test from `docs/idea-vet.md`.

## User Stories
- As Nathaniel, I can list today's tasks with a length so that I see what my day actually holds.
- As Nathaniel, I can ask Claude to plan my day so that the important work lands in my best hours and my meetings stay untouched.
- As Nathaniel, I can drag and adjust blocks myself so that the plan is mine, not the AI's.
- As Nathaniel, I can send the plan to Google Calendar in one step so that my calendar matches my day. *(Later: Google sign-in.)*
- As Nathaniel, I can paste my Google or Apple calendar's share link once so that my meetings are already on the timeline.
- As Nathaniel, I can look back at past days so that I see what I actually did.
- As Nathaniel, unfinished tasks move into the new day on their own so that nothing gets lost overnight.
- As Nathaniel, I can see what I should be doing right now and how long is left.
- As Nathaniel, when a block ends I can add 5, 10 or 30 minutes so that running over doesn't wreck the rest of my plan.
- As someone Nathaniel shares the link with, I can open it in my browser and plan my day by hand, with my own calendars and history, without signing up.

## Functional Requirements

### Tasks
- FR-001: I can add a task with a name and a length of 5, 10, 15, 30 or 60 minutes (or a custom multiple of 5).
- FR-002: I can mark a task as fixed (must not move) or flexible. Breaks are flexible and shrinkable by default.
- FR-003: I can edit, reorder by priority, and delete tasks.

### Day timeline
- FR-004: Today shows as a vertical timeline in 5-minute steps, from a configurable day start to day end.
- FR-005: Calendar events for today appear on the timeline as fixed blocks I cannot drag. Until a calendar is connected, I can add meetings by hand as fixed blocks.
- FR-006: I can place a task by dragging it (or pick-then-click) onto a free slot, move it, resize it, and remove it.
- FR-007: A block cannot overlap another block; an invalid drop shows a short inline message and snaps back.
- FR-008: Blocks are coloured by kind (deep work, body/outside, light/rest) with a small legend; total planned time is shown.

### Plan it for me
- FR-009: "Plan it for me" asks Claude to place all unplaced tasks into free gaps, most important first, with short breaks, never moving fixed blocks, and shows the result on the timeline before anything is saved to the calendar.
- FR-010: The plan comes with a one-line summary of the reasoning. I can accept it, tweak it, or undo back to the previous state.
- FR-011: If not everything fits, the tasks that didn't fit are listed as unplaced with a short note, not silently dropped.

### Calendar
- FR-012 (v2): In the app I can add a calendar by pasting its share link (Google "secret address in iCal format" or an Apple/iCloud shared calendar link) and giving it a name. I can add several and remove any. Today's events from all of them appear as fixed blocks.
- FR-012a (v2): Events refresh when the app loads and every few minutes while it's open. Changes on the calendar side show up without me doing anything; Apple links may lag.
- FR-012b (v2): Imported calendars are read-only. The app never changes them.
- FR-012c (v2): The share link is treated as private: it is saved only in my browser, is only used to fetch that calendar, is never stored or logged on the server, and is not shown in full after saving.
- FR-013 *(Later, needs Google sign-in)*: "Send to calendar" creates one event per planned block (not for calendar events already there) and later updates or removes those same events when the plan changes, without touching events the app didn't create.
- FR-014 *(Later, needs Google sign-in)*: Before sending, I see how many events will be created, changed and removed, and confirm.

### Live day
- FR-015: A "now" marker moves down the timeline; the current block is highlighted with its remaining time counting down.
- FR-016: When a block ends, I get a browser notification: "[Block] done. Next: [next block]", with +5, +10 and +30 minute options where the browser supports buttons, and the same options in the app otherwise.
- FR-017: Adding time extends the current block and re-flows the rest of the day: shrink breaks first, then move flexible tasks later, never move fixed blocks. A one-line reason explains what changed (e.g. "Shortened 15:00 break by 10 min, moved Read to 17:30").
- FR-018: If the re-flow pushes tasks past the end of the day, those tasks become unplaced and are named in the reason.
- FR-019: I can mark a block done early; the next block can start now (pulling the day earlier) or keep its time, my choice.

### Persistence and setup
- FR-020 (v2): Every day's tasks and plan are kept on this machine indefinitely and survive reloads and browser restarts.
- FR-020a (v2): When a new day starts, yesterday's unfinished tasks are added to today automatically, unplaced. A short notice says how many were carried, with Undo. On the past day they show as "moved to [date]".

### History
- FR-023 (v2): Arrows next to the date step back and forward through days. Today is the default; a "Today" link jumps back.
- FR-024 (v2): A past day is read-only: its timeline, its tasks, which were done, and which moved on. Days with nothing saved show an empty state.
- FR-021 (v2): Secret keys (Claude API key, access code, later the Google OAuth client) live only in the hosting settings, never in the repo and never sent to the browser.
- FR-022: Task names, calendar contents, calendar links and model output are never logged.

### Hosting and access (v2)
- FR-025: The app is a web app at a public, shareable address, free, opened in any modern browser. Anyone with the link can use it without an account or install.
- FR-026: Each person's tasks, days, settings and calendar links are saved only in their own browser. There is no shared database; clearing the browser clears their data.
- FR-027: "Plan it for me" and "Re-plan with Claude" work only after the owner's access code has been entered once in that browser. Without it, the buttons explain that AI planning is private, and everything else (manual planning, history, calendars, live day) works normally.
- FR-028: The access code and the Claude key are never visible to visitors. The owner can change the code at any time, which signs out every browser that used the old one.

## Edge Cases & Error States
- No Claude key or the AI call fails: planning shows a clear message; manual planning still works.
- Wrong access code: a short "That code didn't work" message; repeated wrong attempts are slowed down so the code can't be guessed.
- Calendar link invalid, removed on the provider side, or unreachable: the timeline works without that calendar's events; a quiet note names the calendar and offers to fix or remove the link. Last successful events are kept until the next good refresh.
- A link that isn't a Google or Apple calendar address is refused with a short reason.
- Offline: calendar refresh is skipped silently; everything else works.
- Notifications blocked: the in-app banner at block end still offers +5/+10/+30.
- Tab in background or laptop asleep at block end: on return, the app shows what was missed and offers "add time" or "move on" for the overdue block.
- A new calendar event appears mid-day that overlaps planned blocks: on the next refresh, the overlap is flagged and I can ask for a re-flow.
- Claude returns a plan that breaks the rules (overlap, moves a fixed block): it is rejected and I see "Couldn't make a valid plan. Try again."
- Zero tasks: an empty state invites me to add tasks or paste a list.
- Carried tasks: Undo removes them from today and restores them on yesterday as unfinished. A task is carried only once per day, even if the app reloads.
- The app wasn't opened for several days: unfinished tasks come from the most recent day that has them.

## Out of Scope
- Accounts, sign-up, sync across devices, payments/paywall (parked, needs idea vet + usage test first)
- Payments, waitlist, analytics
- Phone app, menu bar app, native Mac app
- Calendars other than Google and Apple share links; writing to any calendar until Google sign-in (later)
- Notion or other task-source import
- Recurring tasks, multi-day planning

## Decisions (resolved questions)
- Google testing-mode reconnect: weekly reconnect is acceptable if the 7-day expiry is real (verify during build).
- Day runs 08:00–21:00 by default, configurable.
- Default model: Sonnet 5.
- Unfinished tasks: ~~ask each morning~~ carried automatically with Undo (v2, 2026-09-30).
- History: kept forever, browse with arrows by the date (v2, 2026-09-30).
- Calendars: share-link import pasted in the app, read-only, Google + Apple (v2, 2026-09-30). Google sign-in for writing back stays later.
- Look: Vercel-style, day and night mode, shadcn/ui (2026-09-30, PR #3).
- Hosting: free public web app, data in each visitor's browser, AI owner-only via access code (v2, 2026-09-30).
- Licence: MIT.
