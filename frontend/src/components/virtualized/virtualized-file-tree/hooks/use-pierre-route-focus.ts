import type {
  FileTree as PierreFileTree,
  FileTreeDirectoryHandle,
} from '@pierre/trees';
import { useEffect } from 'react';
import {
  useFilePathFromRoute,
  useFolderPathFromRoute,
} from '../../../../hooks/routes';
import { getRenameInput, scrollTreePathIntoView } from '../model-utils';

/**
 * Keeps the @pierre/trees focused path in sync with the current `/notes/*`
 * route, expanding ancestor folders and scrolling the row into view. The
 * package itself scrolls only on user-driven focus changes, so this also
 * covers the cases it misses: a freshly revealed panel (the sidebar hides the
 * tree with <Activity>, whose reveal re-runs this effect) and deep links.
 *
 * Folder routes need a trailing slash because that is how @pierre/trees marks
 * a path as a directory; without it the lookup returns the wrong node kind.
 */
export function usePierreRouteFocus(
  model: PierreFileTree | null,
  // Re-run when the model's path set changes (phase-2 resetPaths) so a deep
  // link scrolls once the full tree is in place.
  pathsRevision: unknown
) {
  const filePath = useFilePathFromRoute();
  const folderPath = useFolderPathFromRoute();
  const targetPath = filePath
    ? filePath.fullPath
    : folderPath
      ? `${folderPath.fullPath}/`
      : null;

  useEffect(() => {
    if (!model || !targetPath) return;
    if (!model.getItem(targetPath)) return;
    // Never move focus while the inline rename editor is open — focusPath
    // would blur it, which commits the rename mid-edit.
    if (getRenameInput(model)) return;

    // focusPath does not expand collapsed ancestors (only startRenaming
    // does), so a hidden target would silently stay hidden without this.
    const segments = targetPath.replace(/\/$/, '').split('/').filter(Boolean);
    for (let i = 1; i < segments.length; i++) {
      const ancestor = `${segments.slice(0, i).join('/')}/`;
      const item = model.getItem(ancestor);
      if (item !== null && item.isDirectory()) {
        const directory = item as FileTreeDirectoryHandle;
        if (!directory.isExpanded()) directory.expand();
      }
    }

    if (model.getFocusedPath() !== targetPath) {
      model.focusPath(targetPath);
    }
    scrollTreePathIntoView(model, targetPath);
  }, [model, targetPath, pathsRevision]);
}
