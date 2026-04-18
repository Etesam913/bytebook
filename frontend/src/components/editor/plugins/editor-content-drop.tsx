import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useWailsEvent } from '../../../hooks/events';
import { EDITOR_CONTENT_DROP } from '../../../utils/events';
import { createFilePath, type FilePath } from '../../../utils/path';
import { useAddDroppedFilesToFolderMutation } from '../../virtualized/virtualized-file-tree/hooks/tree-item-mutations';
import type { FilePayload } from '../nodes/file';
import { setSelectionFromPointerInNoteEditor } from '../utils/note-commands';
import { INSERT_FILES_COMMAND } from './file';

type EditorContentDropEventData = {
  droppedFiles?: string[];
  targetElementId?: string;
  x?: number;
  y?: number;
};

const NOTES_PREFIX = 'notes/';

/**
 * Wails handles external OS file drags in two separate phases on macOS/Linux:
 *
 * 1. During hover, the runtime drives `window._wails.handleDragOver(x, y)`
 *    instead of normal DOM/Lexical `dragover` events, so the draggable-block
 *    hook patches those globals to keep the fake drop caret in sync.
 * 2. On drop, Wails emits `EDITOR_CONTENT_DROP` with the dropped file paths and
 *    final coordinates, and this plugin finishes the editor-specific work:
 *    copy the files into the note folder, place the Lexical selection at the
 *    reported drop point, and dispatch `INSERT_FILES_COMMAND`.
 *
 * The patching therefore exists only to preserve live caret feedback while the
 * user is hovering; this plugin is still required because the actual file
 * insertion happens later through Wails' custom event, not a DOM `drop`.
 *
 * Listens for OS file drops over the editor container, copies the files into
 * the open note's folder, and inserts them as FileNodes at the current caret.
 */
export function EditorContentDropPlugin({ filePath }: { filePath: FilePath }) {
  const [editor] = useLexicalComposerContext();
  const { mutateAsync: addDroppedFilesToFolder } =
    useAddDroppedFilesToFolderMutation();

  useWailsEvent(EDITOR_CONTENT_DROP, (event) => {
    const data = event.data as EditorContentDropEventData;
    const droppedFiles = data.droppedFiles ?? [];
    if (droppedFiles.length === 0) return;

    void addDroppedFilesToFolder({
      folderPath: filePath.folder,
      filePaths: droppedFiles,
    }).then((newPaths) => {
      const filePayloads: FilePayload[] = [];
      for (const rawPath of newPaths) {
        const relative = rawPath.startsWith(NOTES_PREFIX)
          ? rawPath.slice(NOTES_PREFIX.length)
          : rawPath;
        const fp = createFilePath(relative);
        if (!fp) continue;
        filePayloads.push({ alt: fp.noteWithoutExtension, src: fp.fileUrl });
      }

      if (filePayloads.length === 0) return;

      // On macOS, Wails intercepts OS drags natively so no DOM drop event
      // fires — the drop coordinates come from the event payload instead.
      // Commit the Lexical selection at the drop point and dispatch the insert
      // command in a single update so the command sees our new selection.
      editor.update(() => {
        if (typeof data.x === 'number' && typeof data.y === 'number') {
          setSelectionFromPointerInNoteEditor(editor, data.x, data.y);
        }
        editor.dispatchCommand(INSERT_FILES_COMMAND, filePayloads);
      });
    });
  });

  return null;
}
