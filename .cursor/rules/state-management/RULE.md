---
description: "State management standards using Jotai and React Query"
globs: ["frontend/src/**/*.{ts,tsx}"]
alwaysApply: false
---

# State Management

Follow these state management patterns:

- **Local/Component State**: Use standard `useState` for simple local state.
- **Global State (Jotai)**:
  - Use Jotai for shared state across components.
  - Name atoms with an `Atom` suffix (e.g., `isNoteMaximizedAtom`, `lastSearchQueryAtom`).
  - Prefer small, focused atoms.
- **Server State (React Query)**:
  - Use TanStack Query (React Query) for data fetching and async operations.
  - Wrap query logic in custom hooks named `use*Query` (e.g., `useFullTextSearchQuery`).
  - Use `MutationCache` and `QueryCache` for global error handling.
- **Error Handling**: Use the `QueryError` utility for consistent error reporting in queries and mutations.

@frontend/src/atoms.ts
@frontend/src/utils/query.ts
@frontend/src/hooks/search.tsx
