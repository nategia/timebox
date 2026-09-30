# Idea vet: AI timeboxing with live re-plan

**Date:** 2026-09-30 · **Verdict:** Park as a product. Update 2026-09-30: personal build approved (Pivot 1, open-source-ready); the app itself becomes the 10-workday test after its phase 3.

## TL;DR
- No hard blocker. Google Calendar is a sensitive scope: 100-user lifetime cap until verified, verification ~10 business days ([Google](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification), [Unipile](https://www.unipile.com/google-oauth-100-user-limit/)). AI cost is cheap (~$1-2/user/month).
- The differentiator is not unique. "Block ran over, re-flow the rest of the day" already exists: FlowSavvy has 1-click Recalculate on its **free** tier ([pricing](https://flowsavvy.app/pricing)), ChronoCat and FlexiPlanner auto-shift remaining tasks on overtime, Motion and Reclaim auto-reschedule ([Zapier](https://zapier.com/blog/best-time-blocking-app/), [Toggl](https://toggl.com/blog/timeboxing-apps)). What's left is UX: the in-the-moment "+10?" prompt and a one-line AI reason.
- Crowded, with a graveyard: Clockwise shut down March 2026, HourStack absorbed into ClickUp ([FlowSavvy roundup](https://flowsavvy.app/top-time-blocking-apps)). You already started this once (`~/Documents/dev/timebox`, Sept 2024, stalled after 11 days), and innrwork TestFlight is the current focus.

## The idea
A calm timeboxing planner that auto-plans your day around your calendar and re-plans live when a block runs over.
- Core flow: add tasks with lengths (5/10/15/30/60 min) → "Plan it for me" fills free calendar gaps → confirm → events created in Google Calendar → when a block ends, notification "Done? Next: X · +5 / +10 / +30" → Claude re-flows flexible blocks, meetings stay fixed, one-line reason shown.
- Where/when: MacBook browser during the work day (Claude Code browser pane or Chrome); phone secondary.
- Day-one value: yes, immediate. No history needed; calendar + a task list is enough.
- Ambition: personal first, maybe paid, promoted on X.
- Who pays: solo knowledge workers who already timebox. Unproven.

## Dependencies
| Dependency | What we need | Status | Source |
|---|---|---|---|
| Google Calendar API | read free/busy + events, create events | Sensitive scope. Unverified = warning screen + 100-user lifetime cap per project. Verification ~10 business days | [Google](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification), [Unipile](https://www.unipile.com/google-oauth-100-user-limit/) |
| Claude API | plan + re-plan calls, structured JSON | Sonnet 5 $2/$10 per MTok, Haiku 4.5 $1/$5 | [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Web push + service worker | "block done" notification with +5/+10/+30 buttons | Action buttons: Chrome 48+, Edge, Firefox 152+. **Safari macOS and iOS: not supported** | [MDN BCD](https://github.com/mdn/browser-compat-data/blob/main/api/ServiceWorkerRegistration.json) |
| iOS web push | phone notifications | Only for Home Screen web apps, iOS 16.4+ | [MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) |
| Scheduler | fire a push at each block end | Needs minute-level scheduling server-side (Supabase pg_cron) or an open tab. Vercel Hobby cron is daily only (checklist, UNVERIFIED for 2026) | checklist §5 |
| Notion (optional) | pull Life Tasks | Works today via connector; a public product would need Notion OAuth | UNVERIFIED |

## Kill checks
| Check | Result | Evidence |
|---|---|---|
| Access | pass (risk at scale) | Individuals can verify sensitive scopes; 100-user cap is fine for personal + beta |
| Terms & money | pass | Charging for a calendar client is normal; Google Limited Use policy applies (no ads/data resale) |
| Runtime reality | risk | Hidden tabs throttle timers; Safari/iPhone notifications can't show +5/+10 buttons, tap opens the app instead. Chrome on Mac works |
| Capability | pass | Calendar create/list/freebusy all live; re-plan is one structured LLM call |

## Market
- Demand evidence: common complaint that time blocking "feels too rigid" and needs constant tweaking during the day ([Medium summary of 200 Reddit posts](https://medium.com/@molased/i-went-through-200-reddit-posts-complains-about-time-blocking-summarized-them-with-actual-quotes-e3b2affd9dfe)). Real pain, but it's the pain competitors already target.
- Competitors: Sunsama $20-25/mo, Motion $19-49/mo, Akiflow ~$24-34/mo, Structured ~$3/mo, FlowSavvy free / $10-14 with free auto-reschedule, ChronoCat and FlexiPlanner (iOS, overtime auto-shift) ([Ellie](https://ellieplanner.com/comparisons/sunsama-vs-motion), [Toggl](https://toggl.com/blog/timeboxing-apps), [FlowSavvy](https://flowsavvy.app/pricing)).
- Graveyard: Clockwise (shut down 2026-03-27), HourStack (into ClickUp), Plan (abandoned since 2021), Edo Agenda (acquired, stale) ([FlowSavvy roundup](https://flowsavvy.app/top-time-blocking-apps)).
- Why isn't anyone doing *exactly* this? Ranked:
  1. `incumbent`: they are, mostly. Auto re-flow is a table-stakes feature. Evidence above.
  2. `economics`: productivity tools churn hard and price is anchored by free tiers (FlowSavvy free, Structured $3). Guess, backed by the price spread.
  3. `technical`: reliable "block ended" nudges need push infra; web can't do lock-screen action buttons on Apple devices. Evidence: MDN.

## Assumptions and tests
| # | Assumption | Test (who, how long) | Kill line |
|---|---|---|---|
| 1 | You'll timebox daily if the tool is nice | Use the in-chat planner (already built) every workday, 10 days | Used under 6 of 10 workdays |
| 2 | The "+10 and re-flow" moment is what makes it stick | During those 10 days, ask for re-plans in chat when blocks overrun; count them | Under 5 re-plans in 10 days |
| 3 | Strangers want *this* over FlowSavvy/Motion | Post 2 screen clips on X (plan + live re-flow), link a waitlist | Under 30 waitlist sign-ups in 14 days |
| 4 | Some will pay | Waitlist asks "$5/mo founding price?" with a Stripe payment link | Under 5 pre-paid in 14 days |
| 5 | AI re-plans are good enough to trust | 20 real re-plans, rate each accept/edit/reject | Under 70% accepted as-is |
| 6 | You'll keep going past week 2 (founder fit) | Compare with the 2024 timebox repo (stalled day 11) | Stops before day 11 again |

**Test order (next 1 to 2 weeks):** 1 + 2 + 5 in parallel using the in-chat planner (zero code). If 1 and 2 pass, post clips for 3 and 4.
**Must pass before real code for a product:** 1, 2 and 3.

## Spikes before any spec (only if tests pass)
1. Google OAuth with calendar.events + freebusy on a throwaway project → pass if events created in the right timezone and free gaps match the real calendar.
2. Re-plan call: 12-block day, +10 on block 3, fixed meeting at 15:00 → pass if meeting untouched, output valid JSON, under 3 s, under $0.02.
3. Web push from Supabase pg_cron at a block end, Chrome on Mac, tab closed → pass if it arrives within 60 s and the +10 button works.

## Economics
One plan or re-plan ≈ 3k input + 1k output tokens. Sonnet 5 ≈ $0.016/call, Haiku 4.5 ≈ $0.008/call. At 1 plan + 4 re-plans per workday: ~$1.70/user/month on Sonnet, ~$0.90 on Haiku.
- 10 users: ~$10-20/mo AI, hosting free.
- 1k users: ~$1-1.7k/mo AI; needs Google verification and paid Supabase (~$25). Viable only above ~$5/user.
- 100k users: AI dominates (~$90-170k/mo); fine at $10+/mo pricing.
First thing to break: Google's 100-user cap, then Supabase free tier pausing.

## Risks
1. Nobody switches from FlowSavvy/Motion for UX alone (high × fatal). Mitigation: X waitlist test before building.
2. Focus split with innrwork TestFlight (high × high). Mitigation: cap personal build at 2 days.
3. Repeat of the 2024 stall (medium × high). Mitigation: kill line 6.
4. Apple devices can't do one-tap +10 from the notification (certain × medium). Mitigation: Chrome on Mac first; native menu bar app only if proven.

## Reasons not to
- Crowded category with free versions of the hero feature.
- Third new idea in September next to innrwork (after Skipify, PitchBabe/UGC agent). PrepTime has no users; innrwork's TestFlight is the launch that matters now.
- You started this exact app in 2024 and stopped after 11 days.

## Pivots (if tests 1-2 pass but 3-4 fail)
1. **Personal tool only**: keep the in-chat planner plus the morning brief. Zero hosting, zero verification. Passes all kill checks.
2. **Feature inside innrwork** (weak): a "plan your day" step after the check-in. Fails checklist §10: auto re-flow is a commodity free elsewhere (FlowSavvy), and it adds scope before TestFlight. Not recommended.
3. **Mac menu bar companion for an existing calendar**: tiny native app, no web push limits, one-tap +10. Only if 1 proves daily use.

## Sources
- https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
- https://www.unipile.com/google-oauth-100-user-limit/
- https://platform.claude.com/docs/en/about-claude/pricing
- https://github.com/mdn/browser-compat-data/blob/main/api/ServiceWorkerRegistration.json
- https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide
- https://flowsavvy.app/pricing
- https://flowsavvy.app/top-time-blocking-apps
- https://zapier.com/blog/best-time-blocking-app/
- https://toggl.com/blog/timeboxing-apps
- https://ellieplanner.com/comparisons/sunsama-vs-motion
- https://medium.com/@molased/i-went-through-200-reddit-posts-complains-about-time-blocking-summarized-them-with-actual-quotes-e3b2affd9dfe
