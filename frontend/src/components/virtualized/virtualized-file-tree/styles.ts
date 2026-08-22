import type { CSSProperties } from 'react';

// `React.CSSProperties` does not admit CSS custom properties, so widen it
// with a template-literal key instead of casting the style object.
type CSSPropertiesWithVariables = CSSProperties & Record<`--${string}`, string>;

// The tree's colors track the app theme via the package's `light-dark()` CSS.
// The background must be opaque — the sticky folder overlay paints rows on top
// of the scrolling list with `--trees-bg` — so match the app background from
// index.html (light rgb(252,252,252) / dark zinc-800).
export const FILE_TREE_HOST_STYLE: CSSPropertiesWithVariables = {
  height: '100%',
  display: 'block',
  cursor: 'default',
  '--trees-bg-override': 'light-dark(rgb(252, 252, 252), rgb(39, 39, 42))',
  // App default text color (near-black / zinc-100), not the package's gray.
  '--trees-fg-override': 'light-dark(rgb(9, 9, 11), rgb(244, 244, 245))',
  '--trees-accent-override': 'var(--accent-color)',
  '--trees-font-family-override': 'var(--app-font-family)',
  // text-sm, so rows scale with UI zoom alongside the rest of the app.
  '--trees-font-size-override': '0.875rem',
  '--trees-density-override': 'var(--ui-scale)',
  '--trees-icon-width-override': 'calc(16px * var(--ui-scale))',
};

// Default cursor on rows + context-menu trigger (the only pointer selectors in
// the package's stylesheet). !important is required: the package's base styles
// are an adopted constructed stylesheet, and WebKit does not merge @layer
// ordering with this <style> element, so a normal declaration loses. The model
// captures unsafeCSS at construction — edits here need a full reload (the
// persistent model survives HMR). The sticky rule separates pinned folder rows
// from the rows scrolling underneath (zinc-200 / zinc-700).
export const FILE_TREE_UNSAFE_CSS = `
  [data-type='item'],
  [data-type='context-menu-trigger'] {
    cursor: default !important;
  }

  [data-type='item'][data-external-drop-target='true'] {
    background-color: var(--trees-selected-bg) !important;
    outline: 1px solid var(--trees-focus-ring-color) !important;
    outline-offset: var(--trees-focus-ring-offset) !important;
  }

  [data-file-tree-sticky-overlay-content="true"] {
    border-bottom: 1px solid light-dark(rgb(228, 228, 231), rgb(63, 63, 70));
  }
`;
