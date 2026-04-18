import { setSelectionFromPointerInNoteEditor } from '../../note-commands';
import { updateFileTreeDropCaret, type DragContext } from '../context';

/**
 * External OS file drag: on macOS/Linux Wails intercepts the drag natively so
 * DOM `dragover` never fires — `wailsDragOver` is patched onto the runtime
 * globals to keep our caret visible. `domDragOver` / `drop` cover the
 * Windows/Chromium path where real DOM events still fire.
 */
export const externalFiles = {
  wailsDragOver(x: number, y: number, ctx: DragContext): void {
    const container = ctx.noteContainerRef?.current;
    if (!container) return;
    const hoverTarget = document.elementFromPoint(x, y);
    if (!hoverTarget || !container.contains(hoverTarget)) return;
    updateFileTreeDropCaret(x, y, ctx);
  },

  domDragOver(event: DragEvent, ctx: DragContext): boolean {
    updateFileTreeDropCaret(event.clientX, event.clientY, ctx);
    return true;
  },

  /**
   * Commit the Lexical selection at the pointer and return `false` so Wails
   * completes the native file-copy. The subsequent `EDITOR_CONTENT_DROP`
   * event then inserts the new nodes via `useInsertFilesOnEditorDrop`.
   */
  drop(event: DragEvent, ctx: DragContext): boolean {
    ctx.editor.update(() => {
      setSelectionFromPointerInNoteEditor(
        ctx.editor,
        event.clientX,
        event.clientY
      );
    });
    return false;
  },
};
