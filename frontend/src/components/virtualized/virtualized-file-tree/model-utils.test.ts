import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import * as trees from '@pierre/trees';
import {
  applySortedTreePathMutation,
  getSortedTreePaths,
  initializeSortedTreePaths,
} from './model-utils';

const models: trees.FileTree[] = [];

function createTrackedTree(paths: string[]) {
  const preparedInput = trees.prepareFileTreeInput(paths);
  const model = new trees.FileTree({ preparedInput });
  initializeSortedTreePaths(model, preparedInput.paths);
  model.onMutation('*', (event) => applySortedTreePathMutation(model, event));
  models.push(model);
  return model;
}

afterEach(() => {
  for (const model of models) model.cleanUp();
  models.length = 0;
});

describe('applySortedTreePathMutation', () => {
  it('prepares the final row order once for a bulk addition', () => {
    const model = createTrackedTree(['Media/', 'existing.md']);
    const importedPaths = Array.from(
      { length: 472 },
      (_, index) => `Media/file-${index}.png`
    );
    const expected = trees.prepareFileTreeInput([
      'Media/',
      'existing.md',
      ...importedPaths,
    ]).paths;
    const prepare = spyOn(trees, 'prepareFileTreeInput');

    try {
      model.batch(importedPaths.map((path) => ({ type: 'add', path })));

      expect(getSortedTreePaths(model)).toEqual(expected);
      expect(prepare).toHaveBeenCalledTimes(1);
    } finally {
      prepare.mockRestore();
    }
  });

  it('applies dependent additions, folder moves, and recursive removals in order', () => {
    const model = createTrackedTree(['Source/', 'Target/', 'keep.md']);

    model.batch([
      { type: 'add', path: 'Source/new.md' },
      { type: 'move', from: 'Source/', to: 'Target/Moved/' },
      { type: 'add', path: 'Target/Moved/later.md' },
      { type: 'remove', path: 'Target/Moved/', recursive: true },
      { type: 'add', path: 'Target/final.md' },
    ]);

    expect(getSortedTreePaths(model)).toEqual(
      trees.prepareFileTreeInput(['Target/', 'Target/final.md', 'keep.md'])
        .paths
    );
  });
});
