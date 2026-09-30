# timebox

Personal AI timeboxing app. Vite + React 18 + TypeScript + Tailwind v3, Zustand, Vitest. Spec: `docs/specs/001-timebox/spec.md`, plan: `docs/plans/001-timebox-v1/plan.md`, tasks: `docs/plans/001-timebox-v1/tasks.md`.

## Commands
- npm only. `dev`, `build`, `typecheck` (`tsc -b`), `lint` (eslint, `-- --fix`), `test` (vitest), `preview`

## Structure
- `src/domain/`: pure functions (time maths, validation). No React. Every block write goes through `validate.ts`.
- `src/store/day-store.ts`: Zustand + persist. All days live in one localStorage key `timebox`; only the last 7 days are kept.
- `src/components/`, `src/hooks/` (side effects live in hooks).
- Styling: `src/styles/tokens.css` is the single source of colours, fonts, spacing; `tailwind.config.js` maps to it. No hex values in components.
