---
trigger: glob
globs: internal/**/*.go, main.go
paths:
  - "internal/**/*.go"
  - "main.go"
---

# Go backend conventions

- Service methods return `config.BackendResponseWithData[T]` / `BackendResponseWithoutData` struct literals directly (no constructor helpers). Error branches return `Success: false` with a human-readable `Message` — never leak raw Go errors to the frontend.
- One service struct per `*_service.go` file in `internal/services/`; files are snake_case; package-level tunables are SCREAMING_SNAKE `var`s (e.g. `TAGS_SEARCH_LIMIT`).
- Wrap internal errors with `fmt.Errorf("...: %w", err)` in non-service packages so callers can `errors.Is`/`As`.
- Logging uses the stdlib `log` package (`log.Printf` / `log.Println`) — not slog or third-party loggers.
- Event names live only in the `util.Events` singleton (`internal/util/events.go`), grouped by category, `namespace:action` string values. Guard emission: `app := application.Get(); if app != nil { app.Event.EmitEvent(...) }`.
- Tests: `testify/assert` with `require.NoError` for setup preconditions; nested `t.Run("Descriptive case name", ...)` subtests (subtest-per-case, not table-driven); `t.TempDir()` for filesystem tests. Run with `gotestsum --format=pkgname --format-icons=hivis ./internal/...`.
- Doc comments are prose sentences above exported funcs, typically ending with a "Returns ..." sentence.
- Changing an exported service method changes the generated TypeScript bindings in `frontend/bindings/` — keep them in sync.
