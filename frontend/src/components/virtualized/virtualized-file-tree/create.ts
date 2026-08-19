import { FILE_TYPE, FOLDER_TYPE } from '../../../utils/tree-item-types';

export type TreeItemType = typeof FOLDER_TYPE | typeof FILE_TYPE;

/**
 * Picks a unique placeholder path for the inline create flow. Pure so it can
 * be unit-tested without a model — callers pass
 * `(path) => model.getItem(path) !== null`. `model.add` throws on duplicate
 * paths, so the scan must cover every colliding representation: the bare
 * name, the directory form, and (for notes) the on-disk `.md` name the
 * placeholder will be moved to after creation.
 */
export function getPlaceholderPath({
  parentPath,
  itemType,
  hasItem,
}: {
  /** pierre folder path, trailing slash included */
  parentPath: string;
  itemType: TreeItemType;
  hasItem: (path: string) => boolean;
}): string {
  for (let i = 1; ; i++) {
    const name = i === 1 ? 'Untitled' : `Untitled ${i}`;
    const base = `${parentPath}${name}`;
    if (itemType === FOLDER_TYPE) {
      if (!hasItem(`${base}/`) && !hasItem(base)) return `${base}/`;
    } else if (!hasItem(base) && !hasItem(`${base}.md`) && !hasItem(`${base}/`)) {
      return base;
    }
  }
}
