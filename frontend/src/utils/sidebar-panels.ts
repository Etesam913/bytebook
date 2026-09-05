import type { SidebarVisibility } from '@/types';

// All valid sidebar panel key names used to identify accordion sections.
export const SIDEBAR_PANEL_KEYS = [
  'files',
  'pinned',
  'recent',
  'kernels',
  'tags',
  'savedSearches',
] as const;

export type SidebarPanelKey = (typeof SIDEBAR_PANEL_KEYS)[number];

// Keep valid saved positions and append any missing sections in the default order.
export function normalizeSidebarOrder(value: unknown): SidebarPanelKey[] {
  const keys = Array.isArray(value) ? value : [];
  return [
    ...new Set([
      ...keys.filter((key): key is SidebarPanelKey =>
        SIDEBAR_PANEL_KEYS.some((validKey) => validKey === key)
      ),
      ...SIDEBAR_PANEL_KEYS,
    ]),
  ];
}

// Exclude hidden sections from dragging and resizing without changing their saved order.
export function getVisibleSidebarOrder(
  order: SidebarPanelKey[],
  visibility: SidebarVisibility
) {
  const hidden = {
    files: false,
    pinned: visibility.hidePinned,
    recent: visibility.hideRecent,
    kernels: visibility.hideKernels,
    tags: visibility.hideTags,
    savedSearches: visibility.hideSavedSearches,
  };
  return order.filter((key) => !hidden[key]);
}

// Hidden sections keep their slots when the visible sections move.
export function mergeSidebarOrder(
  order: SidebarPanelKey[],
  visibleOrder: SidebarPanelKey[]
) {
  let index = 0;
  return order.map((key) =>
    visibleOrder.includes(key) ? visibleOrder[index++] : key
  );
}
