import type { FileTree as PierreFileTree } from '@pierre/trees';
import { useEffect } from 'react';
import { getRenameInput, revealTreePath } from '../model-utils';
import { usePierreRouteTargetPath } from './use-route-target-path';

/**
 * Keeps the @pierre/trees highlighted row in sync with the current `/notes/*`
 * route, expanding ancestor folders and scrolling the row into view. The
 * package itself scrolls only on user-driven focus changes, so this also
 * covers the cases it misses: a freshly revealed panel (the sidebar hides the
 * tree with <Activity>, whose reveal re-runs these effects) and deep links.
 */
export function usePierreRouteFocus(
  model: PierreFileTree | null,
  // Changes when the model's path set changes (`useSyncAllPaths` revisions) so
  // a deep link is revealed once the full tree is in place.
  pathsRevision: unknown
) {
  const targetPath = usePierreRouteTargetPath();

  // Route changes and panel reveals: always re-highlight and scroll (the
  // scroll helper no-ops when the row is already in the viewport).
  useEffect(() => {
    if (!model || !targetPath) return;
    if (!model.getItem(targetPath)) return;
    // Never move focus while the inline rename editor is open — focusPath
    // would blur it, which commits the rename mid-edit.
    if (getRenameInput(model)) return;
    revealTreePath(model, targetPath);
  }, [model, targetPath]);

  // Path revisions: only for a target the effect above could not reveal yet
  // (a deep link waiting on the phase-2 path list). The already-highlighted
  // check keeps unrelated disk changes from yanking the scroll position.
  useEffect(() => {
    if (!model || !targetPath) return;
    const item = model.getItem(targetPath);
    if (!item) return;
    if (model.getFocusedPath() === targetPath && item.isSelected()) return;
    if (getRenameInput(model)) return;
    revealTreePath(model, targetPath);
  }, [model, targetPath, pathsRevision]);
}
