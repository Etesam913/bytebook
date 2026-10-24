import { useSetAtom } from 'jotai';
import { contextMenuDataAtom } from '@/atoms';
import { useContextMenuItems } from '@components/context-menu/items';
import { useProjectSettingsQuery } from '@hooks/project-settings';
import {
  createFilePath,
  createFolderPath,
  stripTrailingSlash,
} from '@utils/path';
import type { DropdownItem } from '@/types';

// Search results allow metadata changes, but never filesystem mutations.
export function useSearchResultsContextMenuItems() {
  const { pin, editTags, openInNewWindow, revealInFinder } =
    useContextMenuItems();
  const {
    data: { pinnedNotes },
  } = useProjectSettingsQuery();

  return ({
    path,
    selectedPaths,
  }: {
    path: string;
    selectedPaths: readonly string[];
  }) => {
    const targets = selectedPaths.includes(path) ? selectedPaths : [path];
    const target = path.endsWith('/')
      ? createFolderPath(path)
      : createFilePath(path);
    const files = targets.filter((entry) => !entry.endsWith('/'));
    const items: DropdownItem[] = [];
    if (targets.length === 1 && target) {
      items.push(
        openInNewWindow({ path: target }),
        revealInFinder({ path: target })
      );
    }
    items.push(
      pin({
        paths: targets.map(stripTrailingSlash),
        shouldPin: targets.some(
          (entry) => !pinnedNotes.has(stripTrailingSlash(entry))
        ),
        kind: files.length === 0 ? 'folder' : 'note',
      })
    );
    if (files.length > 0) items.push(editTags({ filePaths: files }));
    return items;
  };
}

export function useSearchResultsContextMenu() {
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const getItems = useSearchResultsContextMenuItems();

  return ({
    path,
    selectedPaths,
    x,
    y,
  }: {
    path: string;
    selectedPaths: readonly string[];
    x: number;
    y: number;
  }) => {
    const targets = selectedPaths.includes(path) ? selectedPaths : [path];
    setContextMenuData({
      isShowing: true,
      items: getItems({ path, selectedPaths }),
      x,
      y,
      targetId: path,
      selectionCount: targets.length,
    });
  };
}
