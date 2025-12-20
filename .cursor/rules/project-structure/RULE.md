---
description: "Project structure and file organization conventions"
alwaysApply: false
---

# Project Structure

Follow the project's file organization and naming conventions:

- **Frontend Directory**: All frontend code lives in `frontend/src/`.
- **Directories**:
  - `components/`: UI components. Large components should have their own subdirectory.
  - `routes/`: Route-level components.
  - `hooks/`: Custom React hooks.
  - `utils/`: Utility functions and constants.
  - `atoms.ts`: Shared Jotai atoms.
- **Naming Conventions**:
  - **Files**: Use kebab-case for filenames (e.g., `search-header.tsx`).
  - **Components**: Use PascalCase for component names (e.g., `SearchHeader`).
  - **Hooks**: Start with `use` (e.g., `useSearch`).
- **Exports**: Use an `index.tsx` file in component/route folders to simplify imports.

@frontend/src/
