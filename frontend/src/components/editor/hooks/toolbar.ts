import { mergeRegister } from '@lexical/utils';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { isEventInCurrentWindow } from '../../../utils/events';
import {
  $getSelection,
  $isNodeSelection,
  BaseSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CLEAR_HISTORY_COMMAND,
  CLICK_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  CUT_COMMAND,
  FORMAT_TEXT_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_ESCAPE_COMMAND,
  type LexicalEditor,
  PASTE_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type TextFormatType,
  UNDO_COMMAND,
} from 'lexical';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useState,
} from 'react';
import { GetNoteMarkdown } from '../../../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import { draggedElementAtom, previousMarkdownAtom } from '../atoms';
import type {
  EditorBlockTypes,
  FloatingDataType,
  Frontmatter,
} from '../../../types';
import { QueryError } from '../../../utils/query';
import { CUSTOM_TRANSFORMERS } from '../transformers';
import {
  overrideClickCommand,
  overrideControlledTextInsertion,
  overrideEscapeKeyCommand,
  overrideUndoRedoCommand,
  overrideUpDownKeyCommand,
} from '../utils/note-commands';
import { $convertFromMarkdownStringCorrect } from '../utils/note-metadata';
import { updateToolbar } from '../utils/toolbar';
import { useWailsEvent } from '../../../hooks/events';
import { useCreateNoteDialog } from '../../../hooks/dialogs';

/** Gets note markdown from local system on mount */
export function useNoteMarkdown(
  editor: LexicalEditor,
  folder: string,
  note: string,
  overflowContainerRef: RefObject<HTMLDivElement | null>,
  setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>,
  setFrontmatter: Dispatch<SetStateAction<Frontmatter>>,
  setNoteMarkdownString: Dispatch<SetStateAction<string | null>>
) {
  const setPreviousMarkdown = useSetAtom(previousMarkdownAtom);
  const [hasFirstLoad, setHasFirstLoad] = useState(false);

  useQuery({
    queryKey: ['note-markdown', `${folder}/${note}.md`],
    queryFn: async () => {
      // Reset previous markdown when loading a new note
      setPreviousMarkdown('');
      const folderAndNote = `${decodeURIComponent(folder)}/${decodeURIComponent(note)}.md`;
      const res = await GetNoteMarkdown(`notes/${folderAndNote}`);
      if (!res.success)
        throw new QueryError(
          `Failed to get note markdown for ${folderAndNote}`
        );

      editor.setEditable(true);
      // You don't want a different note to access the same history when you switch notes
      editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
      setNoteMarkdownString(res.data ?? null);
      setPreviousMarkdown(res.data ?? '');
      setHasFirstLoad(true);

      editor.update(
        () => {
          // Clear formatting
          setCurrentSelectionFormat((prev) => {
            for (const format of prev)
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
            return [];
          });

          // Apply the new markdown to the editor
          $convertFromMarkdownStringCorrect(
            res.data ?? '',
            CUSTOM_TRANSFORMERS,
            setFrontmatter
          );
          // Scroll to top of page after note markdown has loaded in
          overflowContainerRef.current?.scrollTo(0, 0);
        },
        { tag: 'note:initial-load' }
      );
      return res.data;
    },
  });
  return { hasFirstLoad };
}

/**
 * These are the events that are registered to the toolbar
 * It overrides up/down arrow keys to handle node selection
 * It also updates the toolbar when the selection changes
 */
export function useToolbarEvents(
  editor: LexicalEditor,
  setDisabled: Dispatch<SetStateAction<boolean>>,
  setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>,
  setCurrentBlockType: Dispatch<SetStateAction<EditorBlockTypes>>,
  setCanUndo: Dispatch<SetStateAction<boolean>>,
  setCanRedo: Dispatch<SetStateAction<boolean>>,
  setNoteSelection: Dispatch<SetStateAction<BaseSelection | null>>,
  setFloatingData: Dispatch<SetStateAction<FloatingDataType>>,
  noteContainerRef: RefObject<HTMLDivElement | null>
) {
  const draggedElement = useAtomValue(draggedElementAtom);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar(
            editor,
            setDisabled,
            setCurrentSelectionFormat,
            setCurrentBlockType,
            setNoteSelection,
            setFloatingData,
            noteContainerRef
          );
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        CONTROLLED_TEXT_INSERTION_COMMAND,
        (e) => {
          return overrideControlledTextInsertion(e, editor, draggedElement);
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        (event) => overrideUpDownKeyCommand(event, 'up'),
        // This priority is needed for arrow key to work with command picker
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => overrideUpDownKeyCommand(event, 'down'),
        // This priority is needed for arrow key to work with command picker
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        () => {
          const selection = $getSelection();
          // When using a node selection, let lexical handle the paste command
          // Otherwise, let the default browser paste behavior handle it
          if (selection && $isNodeSelection(selection)) {
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        CUT_COMMAND,
        () => {
          const selection = $getSelection();
          if (selection && $isNodeSelection(selection)) {
            const nodes = selection.getNodes();
            // cmd+x in a code block should not cut the whole code block, it should cut the selected text inside of the code block.
            // The code block maintains its own selection logic as it is using codemirror.
            if (nodes.some((node) => node.getType() === 'code-block')) {
              return true;
            }
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (canUndo) => {
          setCanUndo(canUndo);
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        (e) => {
          const selection = $getSelection();
          if ($isNodeSelection(selection)) {
            const nodes = selection.getNodes();
            let isInProhibitedNode = false;
            nodes.forEach((node) => {
              // Backspace in code block could mean you are deleting code instead of the whole block.
              if (
                node.getType() === 'code-block' ||
                node.getType() === 'excalidraw'
              ) {
                isInProhibitedNode = true;
                return;
              }
              node.remove();
            });
            if (!isInProhibitedNode) {
              e.preventDefault();
              return true;
            }
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (canRedo) => {
          setCanRedo(canRedo);
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        UNDO_COMMAND,
        overrideUndoRedoCommand,
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        REDO_COMMAND,
        overrideUndoRedoCommand,
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        CLICK_COMMAND,
        overrideClickCommand,
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          const selection = $getSelection();
          if ($isNodeSelection(selection)) {
            const node = selection.getNodes().at(0);
            if (node) {
              overrideEscapeKeyCommand(node.getKey());
              return true;
            }
          }
          return true;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [
    editor,
    setCurrentSelectionFormat,
    setCurrentBlockType,
    setDisabled,
    setCanRedo,
    setCanUndo,
    noteContainerRef,
    draggedElement,
  ]);
}

/**
 * Custom hook to handle the "search:note" Wails event.
 * Toggles the search UI open/closed when the event is received for the current window.
 */
export function useSearchNoteEvent(): [
  boolean,
  Dispatch<SetStateAction<boolean>>,
] {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useWailsEvent('search:note', async (data) => {
    if (!(await isEventInCurrentWindow(data))) return;
    setIsSearchOpen((prev) => !prev);
  });

  return [isSearchOpen, setIsSearchOpen];
}

/**
 * Custom hook to handle the "note:create-dialog" Wails event.
 * Opens the create note dialog for the specified folder when the event is received for the current window.
 */
export function useNewNoteEvent(folder: string): void {
  const openCreateNoteDialog = useCreateNoteDialog();

  useWailsEvent('note:create-dialog', async (data) => {
    if (!(await isEventInCurrentWindow(data))) return;
    openCreateNoteDialog(folder);
  });
}
