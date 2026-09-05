import { describe, expect, it } from 'bun:test';
import {
  getVisibleSidebarOrder,
  mergeSidebarOrder,
  normalizeSidebarOrder,
  SIDEBAR_PANEL_KEYS,
} from './sidebar-panels';

describe('sidebar order', () => {
  it('defaults missing settings and repairs duplicate, unknown and missing sections', () => {
    expect(normalizeSidebarOrder(undefined)).toEqual([...SIDEBAR_PANEL_KEYS]);
    expect(normalizeSidebarOrder(['tags', 'files', 'tags', 'unknown'])).toEqual(
      ['tags', 'files', 'pinned', 'recent', 'kernels', 'savedSearches']
    );
  });

  it('keeps hidden sections in their saved slots when visible sections move', () => {
    const order = [...SIDEBAR_PANEL_KEYS];
    const visibility = {
      hidePinned: true,
      hideRecent: false,
      hideKernels: true,
      hideTags: false,
      hideSavedSearches: false,
    };

    const reordered = mergeSidebarOrder(order, [
      'tags',
      'files',
      'recent',
      'savedSearches',
    ]);

    expect(reordered).toEqual([
      'tags',
      'pinned',
      'files',
      'kernels',
      'recent',
      'savedSearches',
    ]);
    expect(getVisibleSidebarOrder(reordered, visibility)).toEqual([
      'tags',
      'files',
      'recent',
      'savedSearches',
    ]);
  });
});
