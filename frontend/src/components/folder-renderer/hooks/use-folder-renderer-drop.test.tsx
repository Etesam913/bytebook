import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getDefaultStore } from 'jotai';

const addDroppedFilesToFolder = mock();
const moveItems = mock();
const wailsEventCallbacks = new Map<string, (event: unknown) => void>();
let wailsDragHandlers: {
  onDragOver?: (x: number, y: number) => void;
  onDragLeave?: () => void;
  onPlatformFileDrop?: () => void;
} = {};

void mock.module('../../../hooks/tree-items', () => ({
  useAddDroppedFilesToFolderMutation: () => ({
    mutate: addDroppedFilesToFolder,
  }),
}));
void mock.module(
  '../../virtualized/virtualized-file-tree/hooks/tree-item-mutations',
  () => ({ useMoveTreeItemsMutation: () => ({ mutate: moveItems }) })
);
void mock.module('../../../hooks/events', () => ({
  useWailsEvent: (name: string, callback: (event: unknown) => void) => {
    wailsEventCallbacks.set(name, callback);
  },
}));
void mock.module('../../../hooks/wails-drag', () => ({
  installWailsDragHandlers: (handlers: typeof wailsDragHandlers) => {
    wailsDragHandlers = handlers;
    return () => {
      wailsDragHandlers = {};
    };
  },
}));

const { useFolderRendererDrop } = await import('./use-folder-renderer-drop');
const { draggedGhostElementAtom } = await import('@/atoms');
const { FILE_TREE_GHOST_ID } =
  await import('@components/editor/utils/drag/context');
const { FOLDER_CONTENT_DROP } = await import('@utils/events');
const { createFolderPath } = await import('@utils/path');

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const folderPath = createFolderPath('My Notes')!;
const store = getDefaultStore();

function Harness() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isDropActive, dragProps } = useFolderRendererDrop({
    folderPath,
    containerRef,
  });
  return (
    <div
      ref={containerRef}
      id="folder-container"
      data-drop-active={String(isDropActive)}
      {...dragProps}
    >
      <span id="child">child</span>
    </div>
  );
}

function dragEvent(type: string, text = ''): MouseEvent {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', {
    value: { getData: () => text, dropEffect: 'none', types: [], files: [] },
  });
  return event;
}

function startFileTreeDrag() {
  const ghost = document.createElement('div');
  ghost.id = FILE_TREE_GHOST_ID;
  void act(() => store.set(draggedGhostElementAtom, ghost));
}

describe('useFolderRendererDrop', () => {
  let mount: HTMLDivElement;
  let root: Root;
  const container = () => document.getElementById('folder-container')!;
  const isActive = () => container().dataset.dropActive === 'true';

  beforeEach(() => {
    addDroppedFilesToFolder.mockClear();
    moveItems.mockClear();
    wailsEventCallbacks.clear();
    mount = document.createElement('div');
    document.body.append(mount);
    root = createRoot(mount);
    void act(() => root.render(<Harness />));
  });

  afterEach(() => {
    void act(() => root.unmount());
    mount.remove();
    void act(() => store.set(draggedGhostElementAtom, null));
  });

  it('starts inactive', () => {
    expect(isActive()).toBe(false);
  });

  it('highlights while a file-tree drag hovers and clears when it leaves', () => {
    startFileTreeDrag();
    const over = dragEvent('dragover');
    void act(() => container().dispatchEvent(over));
    expect(isActive()).toBe(true);
    expect(over.defaultPrevented).toBe(true);

    // Leaving into a child keeps the highlight, leaving the container clears it.
    void act(() =>
      container().dispatchEvent(
        new MouseEvent('dragleave', {
          bubbles: true,
          relatedTarget: document.getElementById('child'),
        })
      )
    );
    expect(isActive()).toBe(true);
    void act(() =>
      container().dispatchEvent(
        new MouseEvent('dragleave', { bubbles: true, relatedTarget: null })
      )
    );
    expect(isActive()).toBe(false);
  });

  it('ignores DOM drags that did not start in the file tree', () => {
    const over = dragEvent('dragover');
    void act(() => container().dispatchEvent(over));
    expect(isActive()).toBe(false);
    expect(over.defaultPrevented).toBe(false);
  });

  it('moves dropped file-tree items into the folder', () => {
    startFileTreeDrag();
    void act(() => container().dispatchEvent(dragEvent('dragover')));
    void act(() =>
      container().dispatchEvent(
        dragEvent('drop', 'wails:/notes/a/note.md,wails:/notes/b/')
      )
    );
    expect(isActive()).toBe(false);
    expect(moveItems).toHaveBeenCalledWith({
      itemPaths: ['a/note.md', 'b/'],
      newFolder: folderPath.fullPath,
    });
  });

  it('tracks native OS drags via the wails drag globals', () => {
    container().getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 100, bottom: 100 }) as DOMRect;
    void act(() => wailsDragHandlers.onDragOver?.(50, 50));
    expect(isActive()).toBe(true);
    void act(() => wailsDragHandlers.onDragOver?.(500, 50));
    expect(isActive()).toBe(false);
    void act(() => wailsDragHandlers.onDragOver?.(50, 50));
    void act(() => wailsDragHandlers.onDragLeave?.());
    expect(isActive()).toBe(false);
  });

  it('adds OS files delivered by the folder content drop event', () => {
    void act(() => wailsDragHandlers.onDragOver?.(50, 50));
    void act(() =>
      wailsEventCallbacks.get(FOLDER_CONTENT_DROP)?.({
        data: { droppedFiles: ['/tmp/a.png', '/tmp/b.pdf'] },
      })
    );
    expect(isActive()).toBe(false);
    expect(addDroppedFilesToFolder).toHaveBeenCalledWith({
      folderPath: folderPath.fullPath,
      filePaths: ['/tmp/a.png', '/tmp/b.pdf'],
    });
  });

  it('ignores content drop events without files', () => {
    void act(() =>
      wailsEventCallbacks.get(FOLDER_CONTENT_DROP)?.({
        data: { droppedFiles: [] },
      })
    );
    expect(addDroppedFilesToFolder).not.toHaveBeenCalled();
  });
});
