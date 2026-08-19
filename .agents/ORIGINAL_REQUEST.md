# Original User Request

## Initial Request — 2026-08-19T02:49:43Z

This is a single self-contained refactor; keep it small and focused.

Migrate frontend imports across the Bytebook codebase from relative paths to TypeScript and Vite path aliases (`@/*`, `@bindings/*`, `@components/*`, `@hooks/*`, `@utils/*`), update the project documentation/rules, and ensure all frontend checks pass.

Working directory: /Users/etesam/Coding/bytebook
Integrity mode: development

## Requirements

### R1. Configure Path Aliases in Tooling
- Configure TypeScript path aliases in `frontend/tsconfig.json`:
  - `@/*` -> `./src/*`
  - `@bindings/*` -> `./bindings/github.com/etesam913/bytebook/internal/*`
  - `@components/*` -> `./src/components/*`
  - `@hooks/*` -> `./src/hooks/*`
  - `@utils/*` -> `./src/utils/*`
- Configure corresponding resolve aliases in `frontend/vite.config.ts`.
- Ensure compatibility with `bunfig.toml`, ESLint (`frontend/eslint.config.js`), and `knip`.

### R2. Migrate Frontend Imports
- Migrate all relative cross-boundary imports across `frontend/src/**/*.{ts,tsx}` to use the appropriate aliases:
  - Wails backend service/model imports (`bindings/github.com/etesam913/bytebook/internal/...`) -> `@bindings/...`
  - Components -> `@components/...`
  - Hooks -> `@hooks/...`
  - Utils -> `@utils/...`
  - Root `src/` files (e.g. `atoms.ts`, `types.ts`, `animations.ts`) -> `@/atoms`, `@/types`, `@/animations`
- Sibling/child imports within the same local directory component folder may remain relative where appropriate.

### R3. Update Rules & Guidelines
- Update `.agents/rules/frontend-react.md` to document the new path alias conventions and replace the previous relative-import rule.

## Acceptance Criteria

### Tooling & Build Verification
- [ ] `bun check:fe` succeeds cleanly with 0 errors:
  - Format (Prettier)
  - Lint (ESLint)
  - Typecheck (`tsgo`)
  - Dead Code (`knip`)
  - Unit Tests (`bun test`)
- [ ] Vite production build (`bun run build:prod` in `frontend/`) succeeds without unresolved module errors.
- [ ] No remaining `../../bindings/github.com/...` deep relative imports in `frontend/src/`.
