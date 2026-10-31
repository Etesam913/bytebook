import { describe, expect, it, mock } from 'bun:test';
import { createStore } from 'jotai';
import type { LegacyAnimationControls } from 'motion';
import { isFileMaximizedAtom } from '@/atoms';
import { toggleFileMaximized } from './file-maximize';

describe('toggleFileMaximized', () => {
  it('toggles the current state and animates in the matching direction', () => {
    const store = createStore();
    const start = mock((definition: unknown) => Promise.resolve(definition));
    const controls = { start } as unknown as LegacyAnimationControls;

    toggleFileMaximized(store, controls);
    expect(store.get(isFileMaximizedAtom)).toBe(true);
    expect(start.mock.calls[0]?.[0]).toMatchObject({ x: [50, 0] });

    toggleFileMaximized(store, controls);
    expect(store.get(isFileMaximizedAtom)).toBe(false);
    expect(start.mock.calls[1]?.[0]).toMatchObject({ x: [-40, 0] });
  });
});
