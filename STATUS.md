# Status

Timebox: free, shareable web app for timeboxing your day. Data stays in each visitor's browser; AI planning is owner-only. Vercel-style look, day/night mode.

## Specs
| # | Spec | Status | Plans |
|---|---|---|---|
| 001 | [Timebox](docs/specs/001-timebox/spec.md) | Approved v2 (2026-09-30) | [001 v1](docs/plans/001-timebox-v1/plan.md) (Approved; phase 1 merged, PR #3) · [002 history](docs/plans/002-history/plan.md) (Done, PR #4) · [003 hosting + calendars](docs/plans/003-hosting-calendars/plan.md) (Approved) |

## Context
- Idea vet 2026-09-30: Park as product; personal build approved. Addendum same day: **Go** as a free, non-commercial hosted web app (Vercel Hobby is non-commercial only). See `docs/idea-vet.md`.
- Usage test (unchanged): used on 6 of 10 workdays, 5+ re-plans, 70%+ re-plans accepted.

## Now
- Plan 003: [tasks](docs/plans/003-hosting-calendars/tasks.md) (5 tasks, one PR). Current: T001 spike. Daily brief still queued.

## Roadmap
1. ~~Plan 002: past days, auto carry-over, backup.~~ Done (PR #4).
2. Plan 003: hosting on Vercel + calendar share-link import (spikes in the idea-vet addendum first).
3. Plan 004: "Plan it for me" (owner-only access code, FR-027/028), then live day (plan 001 phase 3).
4. 10-workday usage test.
5. If it passes: "Premium" button with a $5 founding-member payment link (merchant of record, e.g. Lemon Squeezy/Paddle) and an email fallback. Needs paid hosting or a host that allows commercial use; GDPR consent line; check Italian tax. Kill lines: 30+ waitlist in 14 days / 5+ pre-paid at $5.
6. If 5+ pay: idea vet, then Pro = AI planning + cloud sync (e.g. Supabase auth + DB; free tier stays local).

## Parked ideas
- Accounts, cross-device sync, paid AI (Pro): needs idea vet + usage test first (roadmap 5–6).
- Mac menu bar companion (live "now" block, one-tap +10): only if the web app proves daily use.
- Google sign-in to write plans back to Google Calendar (FR-013/014).
