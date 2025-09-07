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
import { isNoteMaximizedAtom, isToolbarDisabledAtom } from '../../../atoms';
import { noteSelectionAtom } from '../atoms';
import { useAttachmentsMutation } from '../../../hooks/attachments';
import { useNoteChangedEvent } from '../../../hooks/notes';
import type { EditorBlockTypes, FloatingDataType } from '../../../types';
import { cn } from '../../../utils/string-formatting';
import { MaximizeNoteButton } from '../../buttons/maximize-note';
import { ToolbarButtons } from '../../buttons/toolbar';
import { Dropdown } from '../../dropdown';
import {
  useNoteMarkdown,
  useSearchNoteEvent,
  useToolbarEvents,
} from '../hooks/toolbar';
import { FloatingMenuPlugin } from '../plugins/floating-menu';
import {
  blockTypesDropdownItems,
  changeSelectedBlocksType,
} from '../utils/toolbar';
import { SettingsDropdown } from './settings-dropdown';
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
  noteMarkdownString,
  setNoteMarkdownString,
}: {
  folder: string;
  note: string;
  floatingData: FloatingDataType;
  setFloatingData: Dispatch<SetStateAction<FloatingDataType>>;
  animationControls: LegacyAnimationControls;
  noteContainerRef: RefObject<HTMLDivElement | null>;
  overflowContainerRef: RefObject<HTMLDivElement | null>;
  frontmatter: Record<string, string>;
  setFrontmatter: Dispatch<SetStateAction<Record<string, string>>>;
  noteMarkdownString: string | null;
  setNoteMarkdownString: Dispatch<SetStateAction<string | null>>;
}) {
  const [editor] = useLexicalComposerContext();
  const [disabled, setDisabled] = useAtom(isToolbarDisabledAtom);
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

  const [isSearchOpen, setIsSearchOpen] = useSearchNoteEvent();

  const { hasFirstLoad } = useNoteMarkdown(
    editor,
    folder,
    note,
    overflowContainerRef,
    setCurrentSelectionFormat,
    setFrontmatter,
    setNoteMarkdownString
  );

  useToolbarEvents(
    editor,
    setDisabled,
    setCurrentSelectionFormat,
    setCurrentBlockType,
    setCanUndo,
    setCanRedo,
    setNoteSelection,
    setFloatingData,
    noteContainerRef
  );

  useNoteChangedEvent(folder, note, editor, setFrontmatter);
  useKernelLaunchEvents(editor);
  useCodeBlockStream(editor);
  useCodeBlockIOPubError(editor);
  useCodeBlockDisplayData(editor);
  useCodeBlockInputRequest(editor);
  useCodeBlockStatus(editor);
  useCodeBlockExecuteResult(editor);
  useCodeBlockExecuteInput(editor);

  const FloatingPlugin = noteContainerRef.current ? (
    createPortal(
      <FloatingMenuPlugin
        floatingData={floatingData}
        setFloatingData={setFloatingData}
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
      noteContainerRef.current
    )
  ) : (
    <></>
  );

  return (
    <>
      {FloatingPlugin}
      <nav
        className={cn(
          'ml-[-4px] flex gap-1.5 border-b-[1px] border-b-zinc-200 px-2 pb-2 pt-2.5 dark:border-b-zinc-700',
          isNoteMaximized && 'pl-[5.75rem]!'
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
              changeSelectedBlocksType(editor, value, insertAttachmentsMutation)
            }
            items={blockTypesDropdownItems}
            buttonClassName="w-[10rem]"
            disabled={disabled}
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
