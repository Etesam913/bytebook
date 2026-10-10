import { useNotePaletteCommands } from '../hooks/palette-commands';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LegacyAnimationControls } from 'motion/react';
import { useAtom, useAtomValue } from 'jotai/react';
import { $isNodeSelection, type TextFormatType } from 'lexical';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { isFullscreenAtom, isFileMaximizedAtom } from '@/atoms';
import { isToolbarDisabledAtom, noteSelectionAtom } from '../atoms';
import { useAttachmentsMutation } from '@hooks/attachments';
import { useNoteWriteEvent } from '@hooks/notes';
import { useCreateTableDialog } from '@hooks/dialogs';
import type { EditorBlockTypes, FloatingDataType, Frontmatter } from '@/types';
import type { FilePath } from '@utils/path';
import { cn } from '@utils/string-formatting';
import { MaximizeNoteButton } from '@components/buttons/maximize-note';
import { ToolbarButtons } from '@components/buttons/toolbar';
import { Dropdown } from '@components/dropdown';
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
import { NoteFindPanel } from './note-find-panel/index';
import { useToggleSidebarEvent } from '@/routes/notes-sidebar/render-note/hooks';
import { routeUrls } from '@utils/routes';
import { navigate } from 'wouter/use-browser-location';

export function Toolbar({
  filePath,
  floatingData,
  setFloatingData,
  noteContainerRef,
  overflowContainerRef,
  animationControls,
  frontmatter,
  setFrontmatter,
  setPlaceholderLineData,
}: {
  filePath: FilePath;
  floatingData: FloatingDataType;
  setFloatingData: Dispatch<SetStateAction<FloatingDataType>>;
  animationControls: LegacyAnimationControls;
  noteContainerRef: RefObject<HTMLDivElement | null>;
  overflowContainerRef: RefObject<HTMLDivElement | null>;
  frontmatter: Frontmatter;
  setFrontmatter: Dispatch<SetStateAction<Frontmatter>>;
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

  const isFileMaximized = useAtomValue(isFileMaximizedAtom);
  const [noteSelection, setNoteSelection] = useAtom(noteSelectionAtom);
  const [canRedo, setCanRedo] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  const isNodeSelection = $isNodeSelection(noteSelection);
  const { insertAttachmentsMutation } = useAttachmentsMutation({
    folder: filePath.folder,
    editor,
  });

  const openCreateTableDialog = useCreateTableDialog();

  const [isSearchOpen, setIsSearchOpen] = useSearchNoteEvent();
  const noteContainerElement = useRefState(noteContainerRef);

  const { getNoteMarkdownQuery } = useNoteMarkdown({
    editor,
    filePath,
    overflowContainerRef,
    setCurrentSelectionFormat,
    setFrontmatter,
  });

  useNotePaletteCommands({
    filePath,
    frontmatter,
    isReady: getNoteMarkdownQuery.isSuccess && !getNoteMarkdownQuery.isFetching,
    openFind: () => {
      setIsSearchOpen(true);
      document.getElementById('note-find-input')?.focus();
    },
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
    setPlaceholderLineData,
  });

  useNoteWriteEvent({ filePath, editor, setFrontmatter });
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
            shouldShowLinkAction
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

  // If the note markdown fails to load, navigate to the not found fallback route
  useEffect(() => {
    if (getNoteMarkdownQuery.isError) {
      navigate(routeUrls.notFoundFallback());
    }
  }, [getNoteMarkdownQuery.isError]);

  return (
    <>
      {FloatingPlugin}
      <nav
        className={cn(
          'ml-[-4px] flex h-(--app-header-height) shrink-0 items-center gap-1.5 border-b border-b-zinc-200 px-2 dark:border-b-zinc-700',
          isFileMaximized && !isFullscreen && 'pl-[100px]'
        )}
      >
        {/* Keyed per note so a stale term and match list never carry over */}
        <NoteFindPanel
          key={filePath.fullPath}
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
        />
        <span className="flex items-center gap-1.5">
          <MaximizeNoteButton animationControls={animationControls} />
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
            disabledTooltipContent="Click note text to format"
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
        <SettingsDropdown filePath={filePath} frontmatter={frontmatter} />
      </nav>
    </>
  );
}
