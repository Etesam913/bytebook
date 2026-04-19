import { eventFiles } from '@lexical/rich-text';
import { HANDLED_GHOST_IDS, type DragContext } from './context';
import { blockReorder } from './sources/block-reorder';
import { externalFiles } from './sources/external-files';
import { fileTreeInternal } from './sources/file-tree';

/** Lexical `DRAGOVER_COMMAND` -> per-source `dragOver` helper. */
export function dispatchDragOver(event: DragEvent, ctx: DragContext): boolean {
  const [isFileTransfer] = eventFiles(event);

  // Non-OS drags must have a recognized ghost element to be handled here.
  if (!isFileTransfer) {
    if (!ctx.draggedGhostElement) return false;
    if (!HANDLED_GHOST_IDS.has(ctx.draggedGhostElement.id)) return false;
  }

  event.preventDefault();
  // Chromium doesn't paint a native insertion caret for these drags; we render
  // `#file-tree-drop-caret` and flag the drop as a copy.
  if ((ctx.isFileTreeDrag || isFileTransfer) && event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }

  if (isFileTransfer) return externalFiles.domDragOver(event, ctx);
  if (!(ctx.isEditorContentDragging || ctx.isFileTreeDrag)) return false;
  if (ctx.isFileTreeDrag) return fileTreeInternal.dragOver(event, ctx);
  return blockReorder.dragOver(event, ctx);
}

/** Lexical `DROP_COMMAND` -> per-source `drop` helper. */
export function dispatchDrop(event: DragEvent, ctx: DragContext): boolean {
  // Single place the drop caret is hidden during DOM drops (the Wails-event
  // path hides it inside `useInsertFilesOnEditorDrop`).
  ctx.dragAndDropCaretMotionValues.opacity.set(0);

  const [isFileTransfer] = eventFiles(event);
  if (isFileTransfer) return externalFiles.drop(event, ctx);
  if (ctx.isFileTreeDrag) return fileTreeInternal.drop(event, ctx);
  return blockReorder.drop(event, ctx);
}
