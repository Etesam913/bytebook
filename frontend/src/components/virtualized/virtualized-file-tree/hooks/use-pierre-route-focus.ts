import type { FileTree as PierreFileTree } from '@pierre/trees';
import { useEffect } from 'react';
import { getRenameInput, revealTreePath } from '../model-utils';
import { usePierreRouteTargetPath } from './use-route-target-path';

// Keeps the @pierre/trees highlighted row in sync with the current `/notes/*`
// route, expanding ancestor folders and scrolling the row into view. The
// package itself scrolls only on user-driven focus changes, so this also
// covers the cases it misses: a freshly revealed panel (the sidebar hides the
// tree with <Activity>, whose reveal re-runs these effects) and deep links.
export function usePierreRouteFocus(
  model: PierreFileTree | null,
  // The model's current path list, from `useSyncAllPaths`. A new identity means
  // the path set changed, so a target that did not exist yet — a just-created
  // item, or a deep link that landed before the tree was populated — can now
  // be revealed.
  pathsRevision: readonly string[] | undefined
) {
  const targetPath = usePierreRouteTargetPath();

  useEffect(() => {
    if (!model || !targetPath) return;
    const item = model.getItem(targetPath);
    if (!item) return;
    // Already highlighted: re-revealing would yank the scroll position on
    // unrelated disk changes.
    if (model.getFocusedPath() === targetPath && item.isSelected()) return;
    // Never move focus while the inline rename editor is open — focusPath
    // would blur it, which commits the rename mid-edit.
    if (getRenameInput(model)) return;
    revealTreePath(model, targetPath);
  }, [model, targetPath, pathsRevision]);
}
