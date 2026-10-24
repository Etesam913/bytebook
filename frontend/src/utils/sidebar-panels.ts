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

export const SIDEBAR_SECTION_OPTIONS: {
  value: Exclude<SidebarPanelKey, 'files'>;
  label: string;
  hideKey: keyof SidebarVisibility;
}[] = [
  { value: 'pinned', label: 'Pinned', hideKey: 'hidePinned' },
  { value: 'recent', label: 'Recent', hideKey: 'hideRecent' },
  { value: 'kernels', label: 'Kernels', hideKey: 'hideKernels' },
  { value: 'tags', label: 'Tags', hideKey: 'hideTags' },
  {
    value: 'savedSearches',
    label: 'Saved Searches',
    hideKey: 'hideSavedSearches',
  },
];

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
  return order.filter((key) => {
    const option = SIDEBAR_SECTION_OPTIONS.find(({ value }) => value === key);
    return !option || !visibility[option.hideKey];
  });
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
