import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  REDO_COMMAND,
  type TextFormatType,
  UNDO_COMMAND,
} from 'lexical';
import { type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { ListCheckbox } from '../../../icons/list-checkbox';
import { OrderedList } from '../../../icons/ordered-list';
import { Redo } from '../../../icons/redo';
import { TextBold } from '../../../icons/text-bold';
import { TextItalic } from '../../../icons/text-italic';
import { TextStrikethrough } from '../../../icons/text-strikethrough';
import { Undo } from '../../../icons/undo';
import { UnorderedList } from '../../../icons/unordered-list';
import type { EditorBlockTypes, FloatingDataType } from '../../../types';
import { cn } from '../../../utils/string-formatting';
import {
  handleToolbarBlockElementClick,
  handleToolbarTextFormattingClick,
} from '../../editor/utils/toolbar';
import { Link } from '../../../icons/link';
import { $isLinkNode } from '../../editor/nodes/link';
import { Tooltip } from '../../tooltip';

type ButtonData = {
  icon: ReactNode;
  onClick: () => void;
  key: string;
  tooltip: string;
  customDisabled?: boolean;
};

export function ToolbarButtons({
  canUndo,
  canRedo,
  isNodeSelection,
  disabled,
  currentBlockType,
  setCurrentBlockType,
  currentSelectionFormat,
  setCurrentSelectionFormat,
  shouldShowUndoRedo,
  setFloatingData,
}: {
  canUndo: boolean;
  canRedo: boolean;
  isNodeSelection: boolean;
  disabled: boolean;
  currentBlockType: EditorBlockTypes;
  setCurrentBlockType: Dispatch<SetStateAction<EditorBlockTypes>>;
  currentSelectionFormat: TextFormatType[];
  setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>;
  shouldShowUndoRedo?: boolean;
  setFloatingData?: Dispatch<SetStateAction<FloatingDataType>>;
}) {
  const [editor] = useLexicalComposerContext();

  const undoRedoData: ButtonData[] = [
    {
      icon: <Undo className="will-change-transform" />,
      onClick: () => {
        editor.dispatchCommand(UNDO_COMMAND, undefined);
      },
      key: 'undo',
      tooltip: 'Undo',
      customDisabled: canUndo || isNodeSelection,
    },
    {
      icon: <Redo className="will-change-transform" />,
      onClick: () => {
        editor.dispatchCommand(REDO_COMMAND, undefined);
      },
      key: 'redo',
      tooltip: 'Redo',
      customDisabled: canRedo || isNodeSelection,
    },
  ];

  const buttonData: ButtonData[] = [
    {
      icon: <TextBold className="will-change-transform" />,
      onClick: () =>
        handleToolbarTextFormattingClick({
          editor,
          currentSelectionFormat,
          setCurrentSelectionFormat,
          textFormat: 'bold',
        }),
      key: 'bold',
      tooltip: 'Bold (⌘B)',
    },
    {
      icon: <TextItalic className="will-change-transform" />,
      onClick: () =>
        handleToolbarTextFormattingClick({
          editor,
          currentSelectionFormat,
          setCurrentSelectionFormat,
          textFormat: 'italic',
        }),
      key: 'italic',
      tooltip: 'Italic (⌘I)',
    },
    {
      icon: <TextStrikethrough className="will-change-transform" />,
      onClick: () =>
        handleToolbarTextFormattingClick({
          editor,
          currentSelectionFormat,
          setCurrentSelectionFormat,
          textFormat: 'strikethrough',
        }),
      key: 'strikethrough',
      tooltip: 'Strikethrough (⌘⇧X)',
    },
    {
      icon: <UnorderedList className="will-change-transform" />,
      onClick: () =>
        handleToolbarBlockElementClick({
          editor,
          block: 'ul',
          currentBlockType,
          setCurrentBlockType,
        }),
      key: 'ul',
      tooltip: 'Bullet List',
    },
    {
      icon: <OrderedList className="will-change-transform" />,
      onClick: () =>
        handleToolbarBlockElementClick({
          editor,
          block: 'ol',
          currentBlockType,
          setCurrentBlockType,
        }),
      key: 'ol',
      tooltip: 'Numbered List',
    },
    {
      icon: <ListCheckbox className="will-change-transform" />,
      onClick: () =>
        handleToolbarBlockElementClick({
          editor,
          block: 'check',
          currentBlockType,
          setCurrentBlockType,
        }),
      key: 'check',
      tooltip: 'Checklist',
    },
  ];

  if (setFloatingData) {
    buttonData.push({
      icon: <Link className="will-change-transform" />,
      onClick: () => {
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return;
          }

          const clonedSelection = selection.clone();
          const selectionNodes = selection.getNodes();

          const previousUrl = selectionNodes
            .map((node) => node.getParent())
            .find((parent) => $isLinkNode(parent))
            ?.getURL();

          setFloatingData((prev) => ({
            ...prev,
            isOpen: true,
            type: 'link',
            previousUrl,
            previousSelection: clonedSelection,
          }));
        });
      },
      key: 'link',
      tooltip: 'Insert Link',
    });
  }

  function getButtonsData() {
    if (shouldShowUndoRedo) {
      return [...undoRedoData, ...buttonData];
    }
    return buttonData;
  }

  const toolbarButtons = getButtonsData().map(
    ({ icon, onClick, key, customDisabled, tooltip }) => {
      return (
        <div
          className="relative flex items-center justify-center px-[0.075rem]"
          key={key}
        >
          <Tooltip
            content={tooltip}
            disabled={disabled || customDisabled}
            delay={{ open: 1000 }}
          >
            <button
              onClick={onClick}
              type="button"
              disabled={disabled || customDisabled}
              aria-label={tooltip}
              className={cn(
                'p-1.5 rounded-md relative z-10 hover:bg-zinc-100 dark:hover:bg-zinc-650 focus:bg-zinc-100 dark:focus:bg-zinc-650',
                (key === currentBlockType ||
                  currentSelectionFormat.includes(key as TextFormatType)) &&
                  !disabled &&
                  !customDisabled &&
                  'button-invert',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {icon}
            </button>
          </Tooltip>
        </div>
      );
    }
  );

  return (
    <span className="flex overflow-hidden items-center">{toolbarButtons}</span>
  );
}
