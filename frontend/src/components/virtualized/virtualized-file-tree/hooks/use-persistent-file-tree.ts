import { FileTree as FileTreeModel } from '@pierre/trees';
import { useRef } from 'react';

/**
 * Replaces @pierre/trees' useFileTree, whose effect cleanup destroys the model
 * under StrictMode's mount→cleanup→mount cycle (and on <Activity> hides) while
 * the rendered tree keeps using it — selection/rename callbacks silently die.
 * The model is created once per component instance and never destroyed: the
 * sidebar tree lives for the window's lifetime, and surviving Activity hides
 * also preserves expansion/selection state across panel switches.
 */
export function usePersistentFileTree(
  options: ConstructorParameters<typeof FileTreeModel>[0]
): FileTreeModel {
  const modelRef = useRef<FileTreeModel | null>(null);
  modelRef.current ??= new FileTreeModel(options);
  return modelRef.current;
}
