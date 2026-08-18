import type { CSSProperties } from 'react';

/**
 * `React.CSSProperties` does not admit CSS custom properties, so widen it with
 * a template-literal key instead of casting the style object.
 */
type CSSPropertiesWithVariables = CSSProperties & Record<`--${string}`, string>;

// The tree's own colors track the app theme automatically: the package uses
// `light-dark()` CSS and `useThemeSetting` sets `color-scheme` on the root
// element. The background must be opaque (not transparent) because the sticky
// folder overlay paints rows on top of the scrolling list with `--trees-bg` —
// match the app background from index.html (light rgb(252,252,252) /
// dark zinc-800).
export const FILE_TREE_HOST_STYLE: CSSPropertiesWithVariables = {
  height: '100%',
  display: 'block',
  cursor: 'default',
  '--trees-bg-override': 'light-dark(rgb(252, 252, 252), rgb(39, 39, 42))',
  // Match the app's default text color (near-black / zinc-100) instead of the
  // package's muted gray default.
  '--trees-fg-override': 'light-dark(rgb(9, 9, 11), rgb(244, 244, 245))',
  '--trees-accent-override': 'var(--accent-color)',
  '--trees-font-family-override': 'var(--app-font-family)',
  // Match the app's standard font size (text-sm / 0.875rem) so tree items
  // scale with UI zoom alongside the rest of the application.
  '--trees-font-size-override': '0.875rem',
  // Scale density (level indents, row gaps, margins) proportionally with UI zoom
  // so spacing never gets mushed or over-expanded.
  '--trees-density-override': 'var(--ui-scale)',
  // Scale icons with UI zoom.
  '--trees-icon-width-override': 'calc(16px * var(--ui-scale))',
};

// Tree rows and the context-menu trigger use the default cursor instead of the
// package's pointer — the only two selectors its stylesheet sets pointer on.
// !important is required: the package's base styles live in an adopted
// constructed stylesheet while this CSS is a <style> element, and WebKit does
// not merge @layer ordering across the two, so a normal declaration here loses
// to the adopted sheet. Note the model captures unsafeCSS at construction, so
// edits here need a full reload (the persistent model survives HMR).
// Separate sticky folder rows from the rows scrolling underneath them
// (zinc-200 / zinc-700).
export const FILE_TREE_UNSAFE_CSS = `
  [data-type='item'],
  [data-type='context-menu-trigger'] {
    cursor: default !important;
  }

  [data-file-tree-sticky-overlay-content="true"] {
    border-bottom: 1px solid light-dark(rgb(228, 228, 231), rgb(63, 63, 70));
  }
`;
