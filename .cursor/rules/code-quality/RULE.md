---
description: "Code quality and development standards"
alwaysApply: true
---

# Code Quality Standards

Maintain high code quality by following these standards:

- **Linter**: Use ESLint for static analysis. Follow the configuration in `frontend/eslint.config.js`.
- **Formatter**: Use Prettier for code formatting. Configuration is in `frontend/package.json`.
- **Package Manager**: Use `bun` for all frontend package management and script execution.
- **Workflow**: Run `bun run format:lint:tsgo` before committing changes to ensure formatting and linting pass.
- **TypeScript**: The project uses strict TypeScript mode. Avoid bypassing type checks.
- **Imports**: Ensure imports are clean and organized. Avoid unused imports.

@frontend/package.json
@frontend/eslint.config.js
