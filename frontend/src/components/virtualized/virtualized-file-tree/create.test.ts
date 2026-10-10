import { afterEach, describe, expect, it, mock } from 'bun:test';
import { FileTree } from '@pierre/trees';
import { QueryError } from '@utils/query';
import { FILE_TYPE, FOLDER_TYPE } from '@utils/tree-item-types';
import { applyTreeCreate, getPlaceholderPath } from './create';

const models: FileTree[] = [];
afterEach(() => {
  for (const model of models) model.cleanUp();
  models.length = 0;
});

function hasItemFrom(paths: readonly string[]) {
  return (path: string) => paths.includes(path);
}

describe('getPlaceholderPath', () => {
  it('returns the first free name for a note', () => {
    const hasItem = hasItemFrom(['docs/Existing.md']);

    const result = getPlaceholderPath({
      parentPath: 'docs/',
      itemType: FILE_TYPE,
      hasItem,
    });

    expect(result).toBe('docs/Untitled');
  });

  it('returns a trailing-slash path for a folder', () => {
    const hasItem = hasItemFrom([]);

    const result = getPlaceholderPath({
      parentPath: 'docs/',
      itemType: FOLDER_TYPE,
      hasItem,
    });

    expect(result).toBe('docs/Untitled/');
  });

  it.each([
    { taken: ['docs/Untitled'], label: 'a bare Untitled node' },
    { taken: ['docs/Untitled.md'], label: 'an Untitled.md note' },
    { taken: ['docs/Untitled/'], label: 'an Untitled directory' },
  ])('skips to Untitled 2 for a note when $label exists', ({ taken }) => {
    const result = getPlaceholderPath({
      parentPath: 'docs/',
      itemType: FILE_TYPE,
      hasItem: hasItemFrom(taken),
    });

    expect(result).toBe('docs/Untitled 2');
  });

  it('skips a folder placeholder past both file and directory collisions', () => {
    const hasItem = hasItemFrom(['docs/Untitled/', 'docs/Untitled 2']);

    const result = getPlaceholderPath({
      parentPath: 'docs/',
      itemType: FOLDER_TYPE,
      hasItem,
    });

    expect(result).toBe('docs/Untitled 3/');
  });

  it('increments until a free suffix is found', () => {
    const hasItem = hasItemFrom([
      'docs/Untitled',
      'docs/Untitled 2.md',
      'docs/Untitled 3/',
    ]);

    const result = getPlaceholderPath({
      parentPath: 'docs/',
      itemType: FILE_TYPE,
      hasItem,
    });

    expect(result).toBe('docs/Untitled 4');
  });
});

describe('applyTreeCreate', () => {
  it('preserves the canonical folder path while a slashless rename awaits its response', async () => {
    const model = new FileTree({ paths: ['docs/Draft/'] });
    models.push(model);
    const pendingPaths = new Set<string>();
    let resolveCreate!: () => void;
    const response = new Promise<void>((resolve) => {
      resolveCreate = resolve;
    });

    const creation = applyTreeCreate({
      model,
      event: {
        sourcePath: 'docs/Untitled',
        destinationPath: 'docs/Draft',
        isFolder: true,
      },
      parentFolderPath: 'docs/',
      pendingPaths,
      onCanonicalPath: () => {},
      addTreeItem: () => response,
    });

    expect([...pendingPaths]).toEqual(['docs/Draft/']);
    resolveCreate();
    await creation;
    expect(model.getItem('docs/Draft/')).not.toBeNull();
    expect(pendingPaths.size).toBe(0);
  });

  it.each(['Draft', 'Draft.md'])(
    'keeps one canonical row for %s while creation is pending',
    async (name) => {
      const model = new FileTree({ paths: [`docs/${name}`] });
      models.push(model);
      const pendingPaths = new Set<string>();
      const canonicalPath = mock();
      let resolveCreate!: () => void;
      const response = new Promise<void>((resolve) => {
        resolveCreate = resolve;
      });
      const addTreeItem = mock(() => response);

      const creation = applyTreeCreate({
        model,
        event: {
          sourcePath: 'docs/Untitled',
          destinationPath: `docs/${name}`,
          isFolder: false,
        },
        parentFolderPath: 'docs/',
        pendingPaths,
        onCanonicalPath: canonicalPath,
        addTreeItem,
      });

      expect(model.getItem('docs/Draft.md')).not.toBeNull();
      expect(model.getItem('docs/Draft')).toBeNull();
      expect([...pendingPaths]).toEqual(['docs/Draft.md']);
      expect(addTreeItem).toHaveBeenCalledWith({
        parentFolderPath: 'docs/',
        addType: FILE_TYPE,
        newName: 'Draft',
      });
      resolveCreate();
      await creation;
      expect(model.getItem('docs/Draft.md')).not.toBeNull();
      expect(pendingPaths.size).toBe(0);
    }
  );

  it('removes only the draft when creation collides with an existing note', async () => {
    const model = new FileTree({ paths: ['docs/Draft', 'docs/Draft.md'] });
    models.push(model);
    const pendingPaths = new Set<string>();

    await applyTreeCreate({
      model,
      event: {
        sourcePath: 'docs/Untitled',
        destinationPath: 'docs/Draft',
        isFolder: false,
      },
      parentFolderPath: 'docs/',
      pendingPaths,
      onCanonicalPath: () => {},
      addTreeItem: () => Promise.reject(new QueryError('File already exists')),
    });

    expect(model.getItem('docs/Draft')).toBeNull();
    expect(model.getItem('docs/Draft.md')).not.toBeNull();
    expect(pendingPaths.size).toBe(0);
  });
});
