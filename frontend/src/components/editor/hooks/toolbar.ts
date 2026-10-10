import { mergeRegister } from '@lexical/utils';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { SEARCH_NOTE } from '@bindings/util/event-names';
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
  KEY_DOWN_COMMAND,
  KEY_ESCAPE_COMMAND,
  type LexicalEditor,
  PASTE_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type TextFormatType,
  UNDO_COMMAND,
  SKIP_DOM_SELECTION_TAG,
} from 'lexical';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useState,
} from 'react';
import { GetNoteMarkdownWithCodeResults } from '@bindings/services/noteservice';
import { draggedGhostElementAtom, previousMarkdownAtom } from '../atoms';
import type { EditorBlockTypes, FloatingDataType, Frontmatter } from '@/types';
import { QueryError } from '@utils/query';
import { CUSTOM_TRANSFORMERS } from '../transformers';
import {
  overrideClickCommand,
  overrideControlledTextInsertion,
  overrideEscapeKeyCommand,
  overrideUndoRedoCommand,
  overrideUpDownKeyCommand,
} from '../utils/note-commands';
import { handleMarkdownPaste } from '../utils/paste';
import { handleKeyboardShortcuts } from '../utils/hotkeys';
import { parseFrontMatter } from '../utils/note-metadata';
import { OPEN_LINK_EDITOR_COMMAND } from '../nodes/link';
import { $openLinkEditor, updateToolbar } from '../utils/toolbar';
import { useCurrentWindowWailsEvent } from '@hooks/events';
import { $convertFromMarkdownString } from '@lexical/markdown';
import type { PlaceholderLineData } from '../types';
import { updatePlaceholderLineData } from '../utils/placeholder-line';
import { applyCodeResultsSidecar } from '../utils/code-results';
import type { FilePath } from '@utils/path';
import { queryKeys } from '@utils/query-keys';

/** Fetches a note snapshot and loads it into the editor when it changes */
export function useNoteMarkdown({
  editor,
  filePath,
  overflowContainerRef,
  setCurrentSelectionFormat,
  setFrontmatter,
}: {
  editor: LexicalEditor;
  filePath: FilePath;
  overflowContainerRef: RefObject<HTMLDivElement | null>;
  setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>;
  setFrontmatter: Dispatch<SetStateAction<Frontmatter>>;
}) {
  const setPreviousMarkdown = useSetAtom(previousMarkdownAtom);

  const getNoteMarkdownQuery = useQuery({
    queryKey: queryKeys.noteMarkdown(filePath.fullPath),
    queryFn: async () => {
      const res = await GetNoteMarkdownWithCodeResults(
        `notes/${filePath.fullPath}`
      );
      if (!res.success) {
        throw new QueryError(
          `Failed to get note markdown for ${filePath.fullPath}`
        );
      }
      return {
        markdown: res.data?.markdown ?? '',
        codeResults: res.data?.codeResults,
      };
    },
  });

  const snapshot = getNoteMarkdownQuery.data;

  // The single place a fetched note is applied to the editor
  useEffect(() => {
    if (!snapshot) return;
    editor.setEditable(true);
    // A different note must not share undo history
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
    setPreviousMarkdown(snapshot.markdown);

    editor.update(
      () => {
        // Clear formatting
        setCurrentSelectionFormat((prev) => {
          for (const format of prev)
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
          return [];
        });

        const { frontMatter, content } = parseFrontMatter(snapshot.markdown);
        setFrontmatter(frontMatter);

        $convertFromMarkdownString(
          content,
          CUSTOM_TRANSFORMERS,
          undefined,
          true,
          false
        );
        applyCodeResultsSidecar(snapshot.codeResults);

        overflowContainerRef.current?.scrollTo(0, 0);
      },
      { tag: ['note:initial-load', SKIP_DOM_SELECTION_TAG] }
    );
  }, [
    editor,
    snapshot,
    overflowContainerRef,
    setCurrentSelectionFormat,
    setFrontmatter,
    setPreviousMarkdown,
  ]);

  return { getNoteMarkdownQuery };
}

/**
 * These are the events that are registered to the toolbar
 * It overrides up/down arrow keys to handle node selection
 * It also updates the toolbar when the selection changes
 */
export function useToolbarEvents({
  editor,
  setDisabled,
  setCurrentSelectionFormat,
  setCurrentBlockType,
  setCanUndo,
  setCanRedo,
  setNoteSelection,
  setFloatingData,
  noteContainerRef,
  setPlaceholderLineData,
}: {
  editor: LexicalEditor;
  setDisabled: Dispatch<SetStateAction<boolean>>;
  setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>;
  setCurrentBlockType: Dispatch<SetStateAction<EditorBlockTypes>>;
  setCanUndo: Dispatch<SetStateAction<boolean>>;
  setCanRedo: Dispatch<SetStateAction<boolean>>;
  setNoteSelection: Dispatch<SetStateAction<BaseSelection | null>>;
  setFloatingData: Dispatch<SetStateAction<FloatingDataType>>;
  noteContainerRef: RefObject<HTMLDivElement | null>;
  setPlaceholderLineData: Dispatch<SetStateAction<PlaceholderLineData>>;
}) {
  const draggedGhostElement = useAtomValue(draggedGhostElementAtom);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        FORMAT_TEXT_COMMAND,
        (format) => {
          // Skip subscript and superscript formatting
          if (format === 'subscript' || format === 'superscript') {
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar({
            editor,
            setDisabled,
            setCurrentSelectionFormat,
            setCurrentBlockType,
            setNoteSelection,
            setFloatingData,
            noteContainerRef,
          });
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      // Measure after the selection and DOM have committed, so the hint follows
      // the current caret rather than the previous line.
      editor.registerUpdateListener(() => {
        updatePlaceholderLineData({
          editor,
          noteContainerRef,
          setPlaceholderLineData,
        });
      }),
      editor.registerCommand(
        CONTROLLED_TEXT_INSERTION_COMMAND,
        (e) => {
          return overrideControlledTextInsertion(
            e,
            editor,
            draggedGhostElement
          );
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
        (event) => {
          const selection = $getSelection();
          // When using a node selection, let lexical handle the paste command
          if (selection && $isNodeSelection(selection)) {
            return true;
          }
          // Convert pasted plain-text markdown (e.g. `**abc**`) into formatted
          // nodes. Without this, only typed markdown shortcuts trigger
          // formatting and pasted markdown stays as literal text.
          if (event instanceof ClipboardEvent) {
            return handleMarkdownPaste(event, editor);
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
              if (node.getType() === 'code-block') {
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
        OPEN_LINK_EDITOR_COMMAND,
        () => $openLinkEditor({ editor, setFloatingData, noteContainerRef }),
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event: KeyboardEvent) => {
          return handleKeyboardShortcuts(event, editor);
        },
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
    setNoteSelection,
    setFloatingData,
    noteContainerRef,
    draggedGhostElement,
    setPlaceholderLineData,
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

  useCurrentWindowWailsEvent(SEARCH_NOTE, () => {
    setIsSearchOpen((prev) => !prev);
  });

  return [isSearchOpen, setIsSearchOpen];
}
