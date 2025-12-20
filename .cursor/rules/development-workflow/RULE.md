---
description: "Development workflow and commands"
alwaysApply: false
---

# Development Workflow

Essential commands and workflow for Bytebook:

- **Framework**: Bytebook is a desktop app built with Wails3 (Go backend + React frontend).
- **Development Server**: Run `wails3 dev --port 5173` from the root directory to start the development environment.
- **Frontend Setup**:
  - Dependencies: `cd frontend && bun install`
  - Scripts: `bun run dev`, `bun run build`, `bun run build:prod`
- **Maintenance**:
  - Formatting and Linting: `bun run format:lint:tsgo` (runs prettier, eslint, and tsgo).
  - Go Dependencies: `go mod tidy`
- **Testing**:
  - Run all frontend tests: `bun test`
  - Run E2E tests: `bun run test:e2e`
  - Run backend tests: `gotestsum --format=pkgname --format-icons=hivis ./internal/...`

@README.md
@frontend/package.json
@Taskfile.yml
