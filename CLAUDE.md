# timebox

Personal AI timeboxing app. Vite + React 18 + TypeScript + Tailwind v3, Zustand. Spec: `docs/specs/001-timebox/spec.md`, plan: `docs/plans/001-timebox-v1/plan.md`.

## Commands
- `dev`, `build` (`tsc -b && vite build`), `typecheck` (`tsc -b`), `lint` (eslint), `preview`
- Package manager: npm. `bun.lockb` is stale and gets deleted in phase 1.

## Structure
- Phase 1 replaces the 2024 todo app (TanStack Router/Query, Radix, `react-beautiful-dnd`) with the single-page layout in the plan. Until then `src/routeTree.gen.ts` is generated, never edit by hand.
- Styling: `src/styles/tokens.css` is the single source of colours, fonts, spacing. No hex values in components.
