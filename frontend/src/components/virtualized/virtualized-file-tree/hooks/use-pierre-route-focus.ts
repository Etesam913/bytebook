import type { FileTree as PierreFileTree } from '@pierre/trees';
import { useEffect } from 'react';
import { getRenameInput, revealTreePath } from '../model-utils';
import { usePierreRouteTargetPath } from './use-route-target-path';

// Keeps the @pierre/trees highlighted row in sync with the current `/notes/*`
// route, expanding ancestor folders and scrolling the row into view. The
// package itself scrolls only on user-driven focus changes, so this also
// covers the cases it misses: a freshly revealed panel (the sidebar hides the
// tree after it becomes visible again) and deep links.
export function usePierreRouteFocus(model: PierreFileTree | null) {
  const targetPath = usePierreRouteTargetPath();

  useEffect(() => {
    if (!model || !targetPath) return;
    const tryReveal = () => {
      const item = model.getItem(targetPath);
      if (!item) return;
      // Already highlighted: re-revealing would yank the scroll position on
      // unrelated disk changes.
      if (model.getFocusedPath() === targetPath && item.isSelected()) return;
      // Never move focus while the inline rename editor is open — focusPath
      // would blur it, which commits the rename mid-edit.
      if (getRenameInput(model)) return;
      revealTreePath(model, targetPath);
    };
    tryReveal();
    // A just-created target is navigated to before its row exists — the row
    // lands via a later model.batch, so retry on mutations. Deferred to a
    // microtask so reveal side effects never run inside the model's own
    // event dispatch.
    let isActive = true;
    const unsubscribe = model.onMutation('*', () => {
      queueMicrotask(() => {
        if (isActive) tryReveal();
      });
    });
    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [model, targetPath]);
}
