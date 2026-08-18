---
trigger: glob
globs: frontend/src/**/*.test.ts, frontend/src/**/*.test.tsx, frontend/tests/**/*.ts
paths:
  - "frontend/src/**/*.test.{ts,tsx}"
  - "frontend/tests/**/*.ts"
---

# Frontend testing

- Unit tests use `bun:test` (`import { describe, it, expect } from 'bun:test'`) — not vitest or jest.
- Tests are colocated next to the source as `<module>.test.ts`.
- When the test needs a DOM, `import '../test/setup'` must be the first import.
- Structure: one `describe` per exported function, sentence-style `it('does X when Y')` names.
- Run with `bun run test:unit` (from `frontend/`).
- E2E tests are Playwright specs under `frontend/tests/e2e/specs/`. The e2e mock harness parses `.js` binding files — regenerate bindings with `bun run e2e:prepare` (no `-ts` flag).
