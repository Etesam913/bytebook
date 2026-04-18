import { calculateZoomLevel } from '@lexical/utils';
import { isHTMLElement } from 'lexical';
import {
  overrideControlledTextInsertion,
  setSelectionFromPointerInNoteEditor,
} from '../../note-commands';
import {
  placeSelectionAtBlockEdge,
  updateFileTreeDropCaret,
  type DragContext,
} from '../context';

/** File-tree drag: user dragged a file/folder node from the sidebar. */
export const fileTreeInternal = {
  dragOver(event: DragEvent, ctx: DragContext): boolean {
    updateFileTreeDropCaret(event.clientX, event.clientY, ctx);
    return true;
  },

  drop(event: DragEvent, ctx: DragContext): boolean {
    const { editor, noteContainer, draggedGhostElement } = ctx;
    if (!noteContainer) return false;
    const { target, pageY, clientX, clientY } = event;
    if (!target || !isHTMLElement(target)) return false;

    editor.update(() => {
      const placedAtPointer = setSelectionFromPointerInNoteEditor(
        editor,
        clientX,
        clientY
      );
      if (!placedAtPointer) {
        // Dropping on an image or code block: fall back to the nearest block
        // edge instead of inserting at the top of the note.
        placeSelectionAtBlockEdge(
          event,
          pageY / calculateZoomLevel(target),
          ctx
        );
      }
      overrideControlledTextInsertion(event, editor, draggedGhostElement);
    });
    return true;
  },
};
