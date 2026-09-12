import { OPEN_LINK_EDITOR_COMMAND } from '../nodes/link';
import { FORMAT_TEXT_COMMAND, type LexicalEditor } from 'lexical';

/**
 * Handles keyboard shortcuts for text formatting commands.
 * Currently handles:
 * - cmd+k / ctrl+k: Insert or edit a link
 * - cmd+shift+x / ctrl+shift+x: Toggle strikethrough
 *
 * @param event - The keyboard event
 * @param editor - The Lexical editor instance
 * @returns true if the event was handled, false otherwise
 */
export function handleKeyboardShortcuts(
  event: KeyboardEvent,
  editor: LexicalEditor
): boolean {
  if (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 'k'
  ) {
    const handled = editor.dispatchCommand(OPEN_LINK_EDITOR_COMMAND, undefined);
    if (handled) event.preventDefault();
    return handled;
  }

  // Handle cmd+shift+x for strikethrough (Mac) or ctrl+shift+x (Windows/Linux)
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'x') {
    event.preventDefault();
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
    return true;
  }

  return false;
}
