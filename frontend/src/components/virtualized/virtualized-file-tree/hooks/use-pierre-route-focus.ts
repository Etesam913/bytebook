import type { FileTree as PierreFileTree } from '@pierre/trees';
import { useEffect } from 'react';
import {
  useFilePathFromRoute,
  useFolderPathFromRoute,
} from '../../../../hooks/routes';

/**
 * Keeps the @pierre/trees focused path in sync with the current `/notes/*`
 * route. Focusing a path also expands its ancestor folders and scrolls it
 * into view, which is exactly the behavior the previous route-focus pipeline
 * implemented by hand.
 *
 * Folder routes need a trailing slash because that is how @pierre/trees marks
 * a path as a directory; without it the lookup returns the wrong node kind.
 */
export function usePierreRouteFocus(model: PierreFileTree | null) {
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
    if (model.getFocusedPath() === targetPath) return;
    model.focusPath(targetPath);
  }, [model, targetPath]);
}
