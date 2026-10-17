import '../../../../test/setup';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { FileTree } from '@pierre/trees';
import { applyTreeRename } from './rename';

const models: FileTree[] = [];
afterEach(() => {
  for (const model of models) model.cleanUp();
  models.length = 0;
});

function createTree(paths: string[]) {
  const model = new FileTree({ paths });
  models.push(model);
  return model;
}

const fileRename = {
  sourcePath: 'docs/old.md',
  destinationPath: 'docs/new.txt',
  isFolder: false,
};

// Match Pierre's ordering: onRename runs before its optimistic model move.
function commitRename({
  model,
  event,
  renameTreeItem,
}: Parameters<typeof applyTreeRename>[0]) {
  applyTreeRename({ model, event, renameTreeItem });
  model.move(event.sourcePath, event.destinationPath);
}

describe('applyTreeRename', () => {
  it('persists a file name including its extension', async () => {
    const model = createTree([fileRename.sourcePath]);
    const response = Promise.resolve();
    const renameTreeItem = mock<
      Parameters<typeof applyTreeRename>[0]['renameTreeItem']
    >(() => response);

    commitRename({ model, event: fileRename, renameTreeItem });
    await response;

    expect(renameTreeItem).toHaveBeenCalledTimes(1);
    expect(renameTreeItem.mock.calls[0]?.[0]).toMatchObject({
      itemType: 'file',
      filePath: { fullPath: fileRename.sourcePath, type: 'file' },
      newName: 'new.txt',
    });
    expect(model.getItem(fileRename.sourcePath)).toBeNull();
    expect(model.getItem(fileRename.destinationPath)).not.toBeNull();
  });

  it('persists a folder name and keeps its descendants at the destination', async () => {
    const model = createTree(['docs/old/note.md']);
    const event = {
      sourcePath: 'docs/old',
      destinationPath: 'docs/new',
      isFolder: true,
    };
    const response = Promise.resolve();
    const renameTreeItem = mock(() => response);

    // Pierre reports slashless folder paths but moves canonical directory paths.
    applyTreeRename({ model, event, renameTreeItem });
    model.move('docs/old/', 'docs/new/');
    await response;

    expect(renameTreeItem).toHaveBeenCalledWith({
      itemType: 'folder',
      folderPath: 'docs/old',
      newName: 'new',
    });
    expect(model.getItem('docs/new/note.md')).not.toBeNull();
    expect(model.getItem('docs/old/')).toBeNull();
  });

  it('does not persist an unchanged name', () => {
    const model = createTree([fileRename.sourcePath]);
    const renameTreeItem = mock(() => Promise.resolve());

    applyTreeRename({
      model,
      event: { ...fileRename, destinationPath: fileRename.sourcePath },
      renameTreeItem,
    });

    expect(renameTreeItem).not.toHaveBeenCalled();
    expect(model.getItem(fileRename.sourcePath)).not.toBeNull();
  });

  it.each([
    {
      sourcePath: 'docs/old.md',
      destinationPath: 'docs/new.txt',
      isFolder: false,
      child: '',
    },
    {
      sourcePath: 'docs/old/',
      destinationPath: 'docs/new/',
      isFolder: true,
      child: 'note.md',
    },
  ])(
    'rolls back a rejected rename of $sourcePath',
    async ({ child, ...event }) => {
      const model = createTree([`${event.sourcePath}${child}`]);
      const response = Promise.reject(new Error('Rename failed'));

      commitRename({ model, event, renameTreeItem: () => response });
      await response.catch(() => {});

      expect(model.getItem(event.sourcePath)).not.toBeNull();
      expect(model.getItem(`${event.sourcePath}${child}`)).not.toBeNull();
      expect(model.getItem(event.destinationPath)).toBeNull();
    }
  );

  it.each(['source-recreated', 'destination-removed'])(
    'does not overwrite newer model state when a rename fails after %s',
    async (change) => {
      const model = createTree([fileRename.sourcePath]);
      let reject!: (reason: Error) => void;
      const response = new Promise<void>((_, rejectResponse) => {
        reject = rejectResponse;
      });

      commitRename({
        model,
        event: fileRename,
        renameTreeItem: () => response,
      });
      if (change === 'source-recreated') model.add(fileRename.sourcePath);
      else model.remove(fileRename.destinationPath);
      reject(new Error('Rename failed'));
      await response.catch(() => {});

      expect(model.getItem(fileRename.sourcePath) !== null).toBe(
        change === 'source-recreated'
      );
      expect(model.getItem(fileRename.destinationPath) !== null).toBe(
        change === 'source-recreated'
      );
    }
  );

  it('reverts an invalid source path after Pierre applies its optimistic move', async () => {
    const model = createTree(['docs/invalid.']);
    const event = {
      sourcePath: 'docs/invalid.',
      destinationPath: 'docs/valid.md',
      isFolder: false,
    };
    const renameTreeItem = mock(() => Promise.resolve());

    commitRename({ model, event, renameTreeItem });
    await Promise.resolve();

    expect(renameTreeItem).not.toHaveBeenCalled();
    expect(model.getItem(event.sourcePath)).not.toBeNull();
    expect(model.getItem(event.destinationPath)).toBeNull();
  });
});
