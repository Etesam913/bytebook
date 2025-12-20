---
description: "Routing patterns using Wouter"
globs: ["frontend/src/**/*.{ts,tsx}"]
alwaysApply: false
---

# Routing Patterns

Follow these routing patterns:

- **Library**: The project uses `wouter` for routing.
- **Route Definitions**: Define route patterns in `frontend/src/utils/routes.ts` within the `ROUTE_PATTERNS` object.
- **Route Builders**: Use `routeBuilders` in `utils/routes.ts` to construct URLs with parameters to ensure consistency.
- **Lazy Loading**: Lazy load route components in `App.tsx` for better performance.
- **Navigation**: Use the `useLocation` hook from `wouter` for programmatic navigation.
- **Route Params**: Use the `*RouteParams` types defined in `utils/routes.ts` for route parameters.

@frontend/src/utils/routes.ts
@frontend/src/App.tsx
