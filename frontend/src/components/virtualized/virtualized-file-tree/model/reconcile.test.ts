import { afterEach, describe, expect, it } from 'bun:test';
import { FileTree, prepareFileTreeInput } from '@pierre/trees';
import {
  applySortedTreePathMutation,
  initializeSortedTreePaths,
} from './model-utils';
import { reconcileTreePaths } from './reconcile';

const models: FileTree[] = [];

function createTrackedTree(paths: readonly string[]) {
  const preparedInput = prepareFileTreeInput(paths);
  const model = new FileTree({ preparedInput, initialExpansion: 'open' });
  initializeSortedTreePaths(model, preparedInput.paths);
  model.onMutation('*', (event) => applySortedTreePathMutation(model, event));
  models.push(model);
  return model;
}

afterEach(() => {
  for (const model of models) model.cleanUp();
  models.length = 0;
});

describe('reconcileTreePaths', () => {
  it('restores a moved folder and its descendants from an unchanged snapshot', () => {
    const paths = [
      'Source/',
      'Source/Child/',
      'Source/Child/note.md',
      'Target/',
    ];
    const model = createTrackedTree(paths);
    model.move('Source/Child/', 'Target/Child/');

    reconcileTreePaths(model, paths);

    expect(model.getItem('Source/Child/')).not.toBeNull();
    expect(model.getItem('Source/Child/note.md')).not.toBeNull();
    expect(model.getItem('Target/Child/')).toBeNull();
    expect(model.getItem('Target/Child/note.md')).toBeNull();
    expect(
      model.getVisibleRows(0, model.getVisibleCount()).map((row) => row.path)
    ).toContain('Source/Child/');
  });

  it('keeps partial successes at their actual destinations and removes optimistic paths', () => {
    const paths = [
      'Source/',
      'Source/a.md',
      'Source/b.md',
      'Source/c.md',
      'Source/d.md',
      'Source/e.md',
      'Source/f.md',
      'Target/',
    ];
    const model = createTrackedTree(paths);
    model.move('Source/a.md', 'Target/a.md');
    model.move('Source/b.md', 'Target/b.md');
    const confirmedPaths = paths
      .filter((path) => path !== 'Source/a.md')
      .concat('Target/a_1.md');

    reconcileTreePaths(model, confirmedPaths);
    reconcileTreePaths(model, confirmedPaths);

    expect(model.getItem('Target/a_1.md')).not.toBeNull();
    expect(model.getItem('Source/b.md')).not.toBeNull();
    expect(model.getItem('Target/a.md')).toBeNull();
    expect(model.getItem('Target/b.md')).toBeNull();
    expect(model.getItem('Source/a.md')).toBeNull();
    expect(model.getItem('Source/c.md')).not.toBeNull();
  });
});
