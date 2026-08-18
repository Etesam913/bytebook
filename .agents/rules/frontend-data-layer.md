---
trigger: glob
globs: frontend/src/**/*.ts, frontend/src/**/*.tsx
paths:
  - "frontend/src/**/*.{ts,tsx}"
---

# Data layer: bindings, queries, events, errors

- Never call Wails backend bindings directly from components. Wrap them in a `use*Query` / `use*Mutation` hook — domain hooks live in `frontend/src/hooks/*.tsx`, feature-local hooks in a `hooks/` folder next to the component.
- Shared query configs are grouped in a `const <domain>Queries = { ... queryOptions({...}) }` object at the top of the hook file (see `hooks/notes.tsx`).
- Query keys are never inlined — always come from the `queryKeys` factory in `frontend/src/utils/query-keys.ts`: `as const` tuples, kebab-case root, `*All` suffix for prefix-invalidation keys.
- On a failed `BackendResponse` (`success: false`), `throw new QueryError(res.message)`. The global `QueryCache`/`MutationCache` `onError` in `main.tsx` toasts it — do not call `toast.error` manually in query/mutation code. When toasting directly elsewhere, always pass `DEFAULT_SONNER_OPTIONS` from `utils/general.ts`.
- Wails event names are never raw strings. Use the SCREAMING_SNAKE constants from `frontend/src/utils/events.ts` (mirrors `internal/util/events.go`) and subscribe with `useWailsEvent()` from `hooks/events.tsx`.
- File tree updates flow through the @pierre/trees model (`model.add/remove/move`) driven by Wails events — not by writing to `fileTreeDataAtom` directly.
