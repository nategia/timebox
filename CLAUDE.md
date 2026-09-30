# timebox

Personal AI timeboxing app. Vite + React 18 + TypeScript + Tailwind v3, shadcn/ui (new-york, Tailwind v3 CLI `shadcn@2.3.0`), Zustand, Vitest. Spec: `docs/specs/001-timebox/spec.md`, plan: `docs/plans/001-timebox-v1/plan.md`, tasks: `docs/plans/001-timebox-v1/tasks.md`.

## Commands
- npm only. `dev`, `build`, `typecheck` (`tsc -b`), `lint` (eslint, `-- --fix`), `test` (vitest), `preview`

## Structure
- `src/domain/`: pure functions (time maths, validation). No React. Every block write goes through `validate.ts`.
- `src/store/day-store.ts`: Zustand + persist. All days live in one localStorage key `timebox`, kept forever (persist `version` 2 + `migrate`; bump both when the saved shape changes). Users back up via Export/Import (`domain/backup.ts`, same migration).
- `src/components/`, `src/hooks/` (side effects live in hooks). `src/components/ui/` = shadcn-generated, add with `npx shadcn@2.3.0 add <name>`; always pass `type="button"` to non-submit Buttons.
- Styling: `src/styles/tokens.css` is the single source of colours, fonts, spacing, using shadcn's semantic names (`primary`, `muted-foreground`…); `tailwind.config.js` maps to it. No hex values in components.
