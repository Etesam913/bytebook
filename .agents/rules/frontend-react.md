---
trigger: glob
globs: frontend/src/**/*.ts, frontend/src/**/*.tsx
paths:
  - "frontend/src/**/*.{ts,tsx}"
---

# React & TypeScript conventions

- Components are `export function PascalCase(...)` declarations — no arrow-function components, no `React.FC`, no default exports (route roots in `App.tsx` are the only exception).
- Type props inline as a destructured object literal in the function signature. Do not create a separate `XProps` interface/type unless the type is imported elsewhere.

  ```tsx
  export function NoteItem({
    title,
    isSelected,
    onSelect,
  }: {
    title: string;
    isSelected?: boolean;
    onSelect: () => void;
  }) { ... }
  ```

- Any function with 3+ parameters takes a single object parameter.
- Prefer `type` aliases over `interface`. Shared types go in `frontend/src/types.ts`; hook-local types stay in the hook file.
- Never use `useCallback` or `useMemo` — the React Compiler handles memoization.
- Use the `ref` prop directly (React 19); never `forwardRef`.
- Imports use TypeScript and Vite path aliases: `@/*` (root `src/` files/folders, e.g. `@/atoms`, `@/types`, `@/animations`, `@/icons/...`, `@/routes/...`), `@bindings/*` (Wails backend Go bindings), `@components/*`, `@hooks/*`, and `@utils/*`. Sibling/child imports within the same local component folder may remain relative where appropriate.
- Files and directories are kebab-case; a folder's main component lives in `index.tsx`.
- Jotai atoms: `camelCaseAtom` naming, defined only in `frontend/src/atoms.ts` or `frontend/src/components/editor/atoms.ts`, each with a one-line `//` comment describing what it holds.
- Styling is Tailwind v4 utilities with `dark:` variants. Conditional classes go through `cn()` from `@utils/string-formatting`. Reserve inline `style={{}}` for dynamic/measured values.
- Paths: use `createFilePath()` / `createFolderPath()` from `@utils/path` (typed `FilePath` / `FolderPath`). `LocalFilePath` is legacy — don't use it in new code.
- Comments: prefer plain `//` line comments over JSDoc blocks; comments explain *why*, not what.
- `switch` statements over unions must be exhaustive (`@typescript-eslint/switch-exhaustiveness-check` is an error).
