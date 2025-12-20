---
description: "Styling conventions using Tailwind CSS and Framer Motion"
globs: ["frontend/src/**/*.{ts,tsx,css}"]
alwaysApply: false
---

# Styling Conventions

Follow these styling conventions:

- **Tailwind CSS**: Use Tailwind CSS for all styling. Avoid custom CSS files unless absolutely necessary.
- **Dark Mode**: Always support dark mode using the `dark:` prefix (e.g., `text-zinc-900 dark:text-zinc-100`).
- **Color Palette**: Use the `zinc` color palette for primary text and backgrounds.
- **Conditional Classes**: Use `clsx` or `tailwind-merge` for conditional class joining.
- **Animations**: Use `motion` (Framer Motion) for animations and transitions.
- **Responsive Design**: Ensure components are responsive using Tailwind's breakpoint prefixes (`sm:`, `md:`, `lg:`, etc.).
- **Icons**: Use existing icon patterns or standard SVG icons.

@frontend/src/index.css
@frontend/vite.config.ts
