import { describe, expect, it } from 'bun:test';
import { createDropNavigationGate } from './drop-navigation';

function flushMicrotasks() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('createDropNavigationGate', () => {
  it('navigates after a microtask when no drop claims the emission', async () => {
    const navigated: string[] = [];
    const gate = createDropNavigationGate((path) => navigated.push(path));

    gate.requestNavigation('a/note.md');
    expect(navigated).toEqual([]);

    await flushMicrotasks();
    expect(navigated).toEqual(['a/note.md']);
  });

  it('swallows the pending navigation when a drop completes in the same task', async () => {
    const navigated: string[] = [];
    const gate = createDropNavigationGate((path) => navigated.push(path));

    // Pierre's selection emission during store.move, then onDropComplete.
    gate.requestNavigation('b/note.md');
    gate.swallowPendingNavigation();

    await flushMicrotasks();
    expect(navigated).toEqual([]);
  });

  it('does not swallow a later selection after a drop without an emission', async () => {
    const navigated: string[] = [];
    const gate = createDropNavigationGate((path) => navigated.push(path));

    // Multi-select drops emit selectedPaths.length > 1, so no navigation is
    // ever requested for them — the gate must self-release.
    gate.swallowPendingNavigation();
    await flushMicrotasks();

    gate.requestNavigation('c/note.md');
    await flushMicrotasks();
    expect(navigated).toEqual(['c/note.md']);
  });
});
