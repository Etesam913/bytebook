import '../../../../test/setup';
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import * as trees from '@pierre/trees';
import {
  applySortedTreePathMutation,
  getSortedTreePaths,
  initializeSortedTreePaths,
  isDirectoryHandle,
  revealTreePath,
  setSortedTreePaths,
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

describe('sorted tree path synchronization', () => {
  it('does not seed an untracked model from a mutation', () => {
    const model = new trees.FileTree({ paths: ['old.md'] });
    models.push(model);
    model.onMutation('*', (event) => applySortedTreePathMutation(model, event));

    model.add('new.md');

    expect(getSortedTreePaths(model)).toBeUndefined();
  });

  it('keeps the prepared row order when paths reset', () => {
    const model = createTrackedTree(['old.md']);
    const prepared = trees.prepareFileTreeInput(['new.md']).paths;
    setSortedTreePaths(model, prepared);

    model.resetPaths(['new.md']);
    initializeSortedTreePaths(model, ['old.md']);

    expect(getSortedTreePaths(model)).toBe(prepared);
  });

  it('moves only the matching file and removes an empty folder nonrecursively', () => {
    const model = createTrackedTree(['empty/', 'note.md', 'note.md.bak']);

    model.move('note.md', 'renamed.md');
    model.remove('empty/');

    expect(getSortedTreePaths(model)).toEqual(['note.md.bak', 'renamed.md']);
  });

  it('does not duplicate paths already supplied by a refetch', () => {
    const model = createTrackedTree(['docs/', 'docs/old.md', 'keep.md']);
    const expected = trees.prepareFileTreeInput([
      'docs/',
      'docs/new.md',
      'keep.md',
    ]).paths;
    setSortedTreePaths(model, expected);

    model.move('docs/old.md', 'docs/new.md');

    expect(getSortedTreePaths(model)).toEqual(expected);
  });
});

describe('revealTreePath', () => {
  const originalFrame = Object.getOwnPropertyDescriptor(
    globalThis,
    'requestAnimationFrame'
  );
  const frames: FrameRequestCallback[] = [];

  afterEach(() => {
    frames.length = 0;
    if (originalFrame)
      Object.defineProperty(globalThis, 'requestAnimationFrame', originalFrame);
    else Reflect.deleteProperty(globalThis, 'requestAnimationFrame');
  });

  function captureFrames() {
    globalThis.requestAnimationFrame = (callback) => frames.push(callback);
  }

  function flushFrames() {
    while (frames.length) frames.shift()!(0);
  }

  it('expands ancestors and replaces selection, focuses, and scrolls to the target', () => {
    captureFrames();
    const model = createTrackedTree([
      'docs/deep/note.md',
      'other.md',
      'unrelated/',
    ]);
    model.getItem('other.md')!.select();
    const scroll = spyOn(model, 'scrollToPath').mockImplementation(() => {});

    revealTreePath(model, 'docs/deep/note.md');
    flushFrames();

    const docs = model.getItem('docs/')!;
    const deep = model.getItem('docs/deep/')!;
    const unrelated = model.getItem('unrelated/')!;
    expect(isDirectoryHandle(docs) && docs.isExpanded()).toBe(true);
    expect(isDirectoryHandle(deep) && deep.isExpanded()).toBe(true);
    expect(isDirectoryHandle(unrelated) && unrelated.isExpanded()).toBe(false);
    expect(model.getSelectedPaths()).toEqual(['docs/deep/note.md']);
    expect(model.getFocusedPath()).toBe('docs/deep/note.md');
    expect(scroll).toHaveBeenCalledWith('docs/deep/note.md', {
      focus: false,
      offset: 'nearest',
    });
    scroll.mockRestore();
  });

  it('keeps the current focus when revealing an already focused folder', () => {
    captureFrames();
    const model = createTrackedTree(['docs/', 'other.md']);
    model.focusPath('docs/');
    model.getItem('docs/')!.select();
    model.getItem('other.md')!.select();
    const focus = spyOn(model, 'focusPath');

    revealTreePath(model, 'docs/');

    expect(model.getSelectedPaths()).toEqual(['docs/']);
    expect(focus).not.toHaveBeenCalled();
    focus.mockRestore();
  });

  it('leaves selection and focus unchanged for a missing path', () => {
    captureFrames();
    const model = createTrackedTree(['note.md']);
    model.getItem('note.md')!.select();
    model.focusPath('note.md');

    revealTreePath(model, 'missing/note.md');

    expect(model.getSelectedPaths()).toEqual(['note.md']);
    expect(model.getFocusedPath()).toBe('note.md');
    expect(frames).toHaveLength(0);
  });

  it('does not scroll to a target removed before the scheduled scroll', () => {
    captureFrames();
    const model = createTrackedTree(['note.md']);
    const scroll = spyOn(model, 'scrollToPath').mockImplementation(() => {});

    revealTreePath(model, 'note.md');
    model.remove('note.md');
    flushFrames();

    expect(scroll).not.toHaveBeenCalled();
    scroll.mockRestore();
  });
});
