import { useState } from 'react';
import { Autocomplete, useFilter } from 'react-aria-components/Autocomplete';
import { Menu, MenuItem } from 'react-aria-components/Menu';
import { AppSearchField } from '@components/input';
import { MotionButton } from '@components/buttons';
import { useAllPaths } from '@hooks/all-paths';
import { useRecentItemFromRoute } from '@hooks/routes';
import { getPlaceholderPath } from '@components/virtualized/virtualized-file-tree/create';
import { splitPathSegments, stripTrailingSlash } from '@utils/path';
import { FILE_TYPE } from '@utils/tree-item-types';
import { Loader } from '@/icons/loader';

export function CreateNote({
  isPending,
  error,
  onSubmit,
  onBack,
  onShowFiles,
}: {
  isPending: boolean;
  error: Error | null;
  onSubmit: (data: { title: string; parent: string }) => Promise<void>;
  onBack: () => void;
  onShowFiles: () => void;
}) {
  const routeItem = useRecentItemFromRoute();
  const { data: paths, isPending: isLoading, isError, refetch } = useAllPaths();
  const [query, setQuery] = useState('');
  const { contains } = useFilter({ sensitivity: 'base' });
  const currentFolder =
    routeItem?.type === 'folder'
      ? stripTrailingSlash(routeItem.fullPath)
      : routeItem?.folder;
  const folders = (paths ?? [])
    .filter((path) => path.endsWith('/'))
    .map((path) => ({ id: stripTrailingSlash(path) }));
  const matchingFolders = folders.filter((folder) =>
    contains(folder.id, query)
  );
  const items = [
    ...matchingFolders.filter((folder) => folder.id === currentFolder),
    ...matchingFolders.filter((folder) => folder.id !== currentFolder),
  ];

  return (
    <>
      <Autocomplete inputValue={query} onInputChange={setQuery}>
        <AppSearchField
          autoFocus
          aria-label="Destination folder"
          placeholder="Choose a destination folder…"
          isDisabled={isPending}
          className="p-2"
          autoComplete="off"
        />
        <Menu
          autoFocus="first"
          aria-label="Destination folders"
          items={items}
          disabledKeys={isPending ? items.map((item) => item.id) : []}
          className="max-h-[50vh] overflow-y-auto px-2 pb-2 outline-none"
          onAction={(id) => {
            if (isPending || !paths) return;
            const parent = String(id);
            const existing = new Set(paths);
            const placeholder = getPlaceholderPath({
              parentPath: `${parent}/`,
              itemType: FILE_TYPE,
              hasItem: (path) => existing.has(path),
            });
            const title = splitPathSegments(placeholder).at(-1)!;
            void onSubmit({ title, parent });
          }}
          renderEmptyState={() => (
            <p className="px-2 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              {isLoading
                ? 'Loading folders…'
                : isError
                  ? 'Could not load folders.'
                  : folders.length === 0
                    ? 'Create a folder before adding a note.'
                    : 'No folders found.'}
            </p>
          )}
        >
          {(folder) => (
            <MenuItem
              id={folder.id}
              textValue={folder.id}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm outline-none data-[focused]:bg-(--accent-color) data-[focused]:text-white"
            >
              <span className="truncate" title={folder.id}>
                {folder.id}
              </span>
              {folder.id === currentFolder && (
                <span className="shrink-0 text-xs">Current folder</span>
              )}
            </MenuItem>
          )}
        </Menu>
      </Autocomplete>
      {error && (
        <p role="alert" className="px-3 pb-2 text-sm text-red-500">
          {error.message}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        <MotionButton
          onPress={onBack}
          isDisabled={isPending}
          className="px-1.5 py-0.5 text-xs"
        >
          Back
        </MotionButton>
        {isPending ? (
          <span role="status" className="flex items-center gap-2">
            <Loader width="1rem" height="1rem" />
            Creating note…
          </span>
        ) : (
          <span>Select a folder to create a note</span>
        )}
        {isError && (
          <MotionButton onPress={() => void refetch()}>Retry</MotionButton>
        )}
        {!isLoading && !isError && folders.length === 0 && (
          <MotionButton onPress={onShowFiles}>Open file sidebar</MotionButton>
        )}
      </div>
    </>
  );
}
