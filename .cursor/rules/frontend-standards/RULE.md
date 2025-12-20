---
description: "Standards for React 19 and TypeScript development"
globs: ["frontend/src/**/*.{ts,tsx}"]
alwaysApply: false
---

# Frontend Development Standards

Follow these standards when working on the frontend:

- **React 19**: Use React 19 features. `react` import is not needed for JSX.
- **TypeScript**: Use strict typing. Avoid `any`. Define interfaces/types for props and data structures.
- **Component Patterns**:
  - Prefer functional components with hooks.
  - Use named exports for components (e.g., `export function MyComponent() { ... }`).
  - Keep components focused and small.
- **Hooks**: Use custom hooks to encapsulate reusable logic (e.g., `useProjectSettings`, `useSearch`).
- **React Compiler**: The project uses `babel-plugin-react-compiler`. Avoid manual `useMemo` or `useCallback` unless necessary for stable references in external libraries or complex performance issues.
- **Lazy Loading**: Lazy load route components using `lazy()` and `Suspense` in `App.tsx`.

@frontend/src/App.tsx
@frontend/src/main.tsx
