---
description: "Testing standards and patterns"
globs: ["**/*.test.{ts,tsx}", "tests/e2e/**"]
alwaysApply: false
---

# Testing Standards

Follow these testing patterns:

- **Unit/Integration Tests**: Use `bun test` for running tests.
- **Component Tests**: Use `@testing-library/react` for component testing.
- **E2E Tests**: Use Playwright for end-to-end testing. E2E tests are located in `frontend/tests/e2e/`.
- **Naming**: Test files should be named `*.test.ts` or `*.test.tsx` and placed alongside the code they test.
- **Backend Tests (Go)**: Run backend tests using `gotestsum --format=pkgname --format-icons=hivis -- -count=1 ./internal/...` from the project root.

@frontend/package.json
@frontend/tests/e2e/playwright.config.ts
@README.md
