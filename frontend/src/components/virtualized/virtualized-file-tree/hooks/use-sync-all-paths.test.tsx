import '../../../../test/setup';
import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { FileTree, prepareFileTreeInput } from '@pierre/trees';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { queryKeys } from '@utils/query-keys';
import * as reconcile from '../reconcile';
import { useSyncAllPaths } from './use-sync-all-paths';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const paths = ['Source/', 'Source/note.md', 'Target/'];
const preparedInput = prepareFileTreeInput(paths);

function TreeSync({
  model,
  isMovePending,
}: {
  model: FileTree;
  isMovePending: boolean;
}) {
  useSyncAllPaths({ model, preparedInput, isMovePending });
  return <section>Files</section>;
}

describe('useSyncAllPaths', () => {
  let mount: HTMLDivElement;
  let root: Root;
  let model: FileTree;
  let queryClient: QueryClient;

  function render(order = ['files', 'pinned'], isMovePending = false) {
    void act(() =>
      root.render(
        <StrictMode>
          <QueryClientProvider client={queryClient}>
            {order.map((key) =>
              key === 'files' ? (
                <TreeSync
                  key={key}
                  model={model}
                  isMovePending={isMovePending}
                />
              ) : (
                <section key={key}>Pinned</section>
              )
            )}
          </QueryClientProvider>
        </StrictMode>
      )
    );
  }

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.append(mount);
    root = createRoot(mount);
    model = new FileTree({ preparedInput });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(queryKeys.allPaths(), paths, { updatedAt: 1 });
  });

  afterEach(() => {
    void act(() => root.unmount());
    mount.remove();
    model.cleanUp();
    queryClient.clear();
  });

  it('does not repeat a full tree reconciliation when sidebar panels reorder', () => {
    const sync = spyOn(reconcile, 'reconcileTreePaths');

    try {
      render();
      render(['pinned', 'files']);
      render(['files', 'pinned']);

      expect(sync).toHaveBeenCalledTimes(1);
      expect(model.getItem('Source/note.md')).not.toBeNull();
    } finally {
      sync.mockRestore();
    }
  });

  it('repairs an optimistic move when a refetch returns the same path array', () => {
    render();
    render(['files', 'pinned'], true);
    model.move('Source/note.md', 'Target/note.md');
    queryClient.setQueryData(queryKeys.allPaths(), paths, { updatedAt: 2 });

    render();

    expect(model.getItem('Source/note.md')).not.toBeNull();
    expect(model.getItem('Target/note.md')).toBeNull();
  });

  it('reconciles a fresh query result even when its path array is unchanged', () => {
    render();
    model.move('Source/note.md', 'Target/note.md');
    queryClient.setQueryData(queryKeys.allPaths(), paths, { updatedAt: 2 });

    render();

    expect(model.getItem('Source/note.md')).not.toBeNull();
    expect(model.getItem('Target/note.md')).toBeNull();
  });
});
