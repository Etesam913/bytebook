import type { FileTree as PierreFileTree } from '@pierre/trees';

/**
 * Returns the inline rename input if the tree is currently in renaming mode.
 * @pierre/trees exposes no public "is renaming" getter, but the rename editor
 * renders inside the tree's shadow root with a stable data attribute.
 */
export function getRenameInput(
  model: PierreFileTree | null
): HTMLInputElement | null {
  if (!model) return null;
  const container = model.getFileTreeContainer();
  if (!container) return null;
  const root =
    container.shadowRoot ??
    (container.getRootNode() instanceof ShadowRoot
      ? (container.getRootNode() as ShadowRoot)
      : null);
  return (
    root?.querySelector<HTMLInputElement>('[data-item-rename-input]') ?? null
  );
}
