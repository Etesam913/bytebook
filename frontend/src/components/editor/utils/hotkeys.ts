import { FORMAT_TEXT_COMMAND, type LexicalEditor } from 'lexical';

/**
 * Handles keyboard shortcuts for text formatting commands.
 * Currently handles:
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
  // Handle cmd+shift+x for strikethrough (Mac) or ctrl+shift+x (Windows/Linux)
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'x') {
    event.preventDefault();
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
    return true;
  }

  return false;
}
