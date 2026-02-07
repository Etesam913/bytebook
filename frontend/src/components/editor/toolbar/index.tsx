import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LegacyAnimationControls } from 'motion/react';
import { useAtom, useAtomValue } from 'jotai/react';
import { $isNodeSelection, type TextFormatType } from 'lexical';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  isFullscreenAtom,
  isNoteMaximizedAtom,
  isToolbarDisabledAtom,
} from '../../../atoms';
import { noteSelectionAtom } from '../atoms';
import { useAttachmentsMutation } from '../../../hooks/attachments';
import { useNoteWriteEvent } from '../../../hooks/notes';
import { useCreateTableDialog } from '../../../hooks/dialogs';
import type {
  EditorBlockTypes,
  FloatingDataType,
  Frontmatter,
} from '../../../types';
import { cn } from '../../../utils/string-formatting';
import { MaximizeNoteButton } from '../../buttons/maximize-note';
import { ToolbarButtons } from '../../buttons/toolbar';
import { Dropdown } from '../../dropdown';
import {
  useNoteMarkdown,
  useSearchNoteEvent,
  useToolbarEvents,
} from '../hooks/toolbar';
import { useRefState } from '../hooks/ref-state';
import { FloatingMenuPlugin } from '../plugins/floating-menu';
import {
  blockTypesDropdownItems,
  changeSelectedBlocksType,
} from '../utils/toolbar';
import { SettingsDropdown } from './settings-dropdown';
import type { PlaceholderLineData } from '../types';
import {
  useCodeBlockDisplayData,
  useCodeBlockExecuteInput,
  useCodeBlockExecuteResult,
  useCodeBlockInputRequest,
  useCodeBlockIOPubError,
  useCodeBlockStatus,
  useCodeBlockStream,
  useKernelLaunchEvents,
} from '../../../hooks/code';
import { NoteFindPanel } from './note-find-panel/index';
import { useToggleSidebarEvent } from '../../../routes/notes-sidebar/render-note/hooks';

export function Toolbar({
  folder,
  note,
  floatingData,
  setFloatingData,
  noteContainerRef,
  overflowContainerRef,
  animationControls,
  frontmatter,
  setFrontmatter,
  tableActionsRef,
  setPlaceholderLineData,
}: {
  folder: string;
  note: string;
  floatingData: FloatingDataType;
  setFloatingData: Dispatch<SetStateAction<FloatingDataType>>;
  animationControls: LegacyAnimationControls;
  noteContainerRef: RefObject<HTMLDivElement | null>;
  overflowContainerRef: RefObject<HTMLDivElement | null>;
  frontmatter: Frontmatter;
  setFrontmatter: Dispatch<SetStateAction<Frontmatter>>;
  tableActionsRef: RefObject<HTMLButtonElement | null>;
  setPlaceholderLineData: Dispatch<SetStateAction<PlaceholderLineData>>;
}) {
  const [editor] = useLexicalComposerContext();
  const [disabled, setDisabled] = useAtom(isToolbarDisabledAtom);
  const isFullscreen = useAtomValue(isFullscreenAtom);
  const [currentBlockType, setCurrentBlockType] =
    useState<EditorBlockTypes>('paragraph');
  const [currentSelectionFormat, setCurrentSelectionFormat] = useState<
    TextFormatType[]
  >([]);

  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  // const [isNodeSelection, setIsNodeSelection] = useState(false);
  const [noteSelection, setNoteSelection] = useAtom(noteSelectionAtom);
  const [canRedo, setCanRedo] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  const isNodeSelection = $isNodeSelection(noteSelection);
  const { insertAttachmentsMutation } = useAttachmentsMutation({
    folder,
    note,
    editor,
  });

  const openCreateTableDialog = useCreateTableDialog();

  const [isSearchOpen, setIsSearchOpen] = useSearchNoteEvent();
  const noteContainerElement = useRefState(noteContainerRef);

  const { hasFirstLoad } = useNoteMarkdown({
    editor,
    folder,
    note,
    overflowContainerRef,
    setCurrentSelectionFormat,
    setFrontmatter,
  });

  useToolbarEvents({
    editor,
    setDisabled,
    setCurrentSelectionFormat,
    setCurrentBlockType,
    setCanUndo,
    setCanRedo,
    setNoteSelection,
    setFloatingData,
    noteContainerRef,
    tableActionsRef,
    setPlaceholderLineData,
  });

  useNoteWriteEvent({ folder, note, editor, setFrontmatter });
  useKernelLaunchEvents(editor);
  useCodeBlockStream(editor);
  useCodeBlockIOPubError(editor);
  useCodeBlockDisplayData(editor);
  useCodeBlockInputRequest(editor);
  useCodeBlockStatus(editor);
  useCodeBlockExecuteResult(editor);
  useCodeBlockExecuteInput(editor);
  useToggleSidebarEvent(animationControls);

  const FloatingPlugin = noteContainerElement
    ? createPortal(
        <FloatingMenuPlugin
          floatingData={floatingData}
          setFloatingData={setFloatingData}
          noteContainerRef={noteContainerRef}
        >
          <ToolbarButtons
            canUndo={canUndo}
            canRedo={canRedo}
            setFloatingData={setFloatingData}
            disabled={disabled}
            isNodeSelection={isNodeSelection}
            currentBlockType={currentBlockType}
            setCurrentBlockType={setCurrentBlockType}
            currentSelectionFormat={currentSelectionFormat}
            setCurrentSelectionFormat={setCurrentSelectionFormat}
          />
        </FloatingMenuPlugin>,
        noteContainerElement
      )
    : null;

  return (
    <>
      {FloatingPlugin}
      <nav
        className={cn(
          'ml-[-4px] flex gap-1.5 border-b border-b-zinc-200 px-2 pb-2 pt-2.5 dark:border-b-zinc-700',
          isNoteMaximized && !isFullscreen && 'pl-23!'
        )}
      >
        <NoteFindPanel
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
          hasFirstLoad={hasFirstLoad}
        />
        <span className="flex items-center gap-1.5">
          <MaximizeNoteButton
            animationControls={animationControls}
            disabled={disabled}
          />
          <Dropdown
            controlledValueIndex={blockTypesDropdownItems.findIndex(
              (v) => v.value === currentBlockType
            )}
            onChange={({ value }) =>
              changeSelectedBlocksType({
                editor,
                newBlockType: value,
                insertAttachmentsMutation,
                openCreateTableDialog,
              })
            }
            items={blockTypesDropdownItems}
            buttonClassName="w-48"
            disabled={disabled}
            aria-label="Select block type"
            id="block-type-dropdown"
          />
        </span>
        <ToolbarButtons
          canUndo={canUndo}
          canRedo={canRedo}
          disabled={disabled}
          isNodeSelection={isNodeSelection}
          currentBlockType={currentBlockType}
          setCurrentBlockType={setCurrentBlockType}
          currentSelectionFormat={currentSelectionFormat}
          setCurrentSelectionFormat={setCurrentSelectionFormat}
          shouldShowUndoRedo
        />
        <SettingsDropdown
          folder={folder}
          note={note}
          isToolbarDisabled={disabled}
          frontmatter={frontmatter}
        />
      </nav>
    </>
  );
}
