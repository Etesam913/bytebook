import type { FileTree as PierreFileTree } from '@pierre/trees';

// Pierre leaves the dragged row selected after a drag ends. Put the selection
// back on the route's row without scrolling; the deselect/select emissions
// never route because onSelectionChange ignores the current route path.
export function restoreSelectionAfterDrag(
  model: PierreFileTree,
  routeTargetPath: string | null
) {
  for (const selectedPath of model.getSelectedPaths()) {
    if (selectedPath !== routeTargetPath) {
      model.getItem(selectedPath)?.deselect();
    }
  }
  if (routeTargetPath) model.getItem(routeTargetPath)?.select();
}
