# Timebox

A calm day planner. List today's tasks, drag them onto a timeline in 5-minute steps, and keep a history of past days. Unfinished tasks carry over to the next day on their own.

Free, no account. **Your data stays in your browser**: nothing about your tasks is sent anywhere. Use **Export backup** (bottom of the page) now and then; on Safari, add the app to your Dock or Home Screen so Safari doesn't clear it after a week away.

## Run locally

```bash
npm install
npm run dev
```

Opens on http://localhost:5173. `npm test`, `npm run typecheck`, `npm run lint` before a PR.

## Deploy (Vercel)

1. Import this repo at vercel.com/new (framework: Vite, detected automatically). No environment variables needed yet.
2. Every merge to `main` deploys; every PR gets a preview link.
3. Optional: in the Vercel dashboard → Firewall, add a rate-limit rule on `/api/calendar`.

Hobby plan is non-commercial only: no payments or ads on it (see `docs/idea-vet.md`).

## How it's built

Vite + React + TypeScript + Tailwind + shadcn/ui, Zustand for state. One serverless function, `api/calendar.ts`, reads Google/iCloud calendar share links (only those hosts, nothing stored or logged). Security headers and the CSP live in `vercel.json`; `npm run preview` serves the same headers locally.

Specs and plans: `docs/`. Status: `STATUS.md`.
