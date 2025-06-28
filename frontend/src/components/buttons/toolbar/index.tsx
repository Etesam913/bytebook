import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { AnimatePresence } from 'motion/react';
import {
  $getSelection,
  $isRangeSelection,
  REDO_COMMAND,
  type TextFormatType,
  UNDO_COMMAND,
} from 'lexical';
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useState,
} from 'react';
import { ListCheckbox } from '../../../icons/list-checkbox';
import { OrderedList } from '../../../icons/ordered-list';
import { Redo } from '../../../icons/redo';
import Subscript from '../../../icons/subscript';
import Superscript from '../../../icons/superscript';
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
import { SidebarHighlight } from '../../sidebar/highlight';
import { Link } from '../../../icons/link';
import { $isLinkNode } from '../../editor/nodes/link';

type ButtonData = {
  icon: ReactNode;
  onClick: () => void;
  key: string;
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
  const [highlightedButton, setHighlightedButton] = useState(-1);
  const [editor] = useLexicalComposerContext();

  const undoRedoData: ButtonData[] = [
    {
      icon: <Undo className="will-change-transform" />,
      onClick: () => {
        editor.dispatchCommand(UNDO_COMMAND, undefined);
      },
      key: 'undo',
      customDisabled: canUndo || isNodeSelection,
    },
    {
      icon: <Redo className="will-change-transform" />,
      onClick: () => {
        editor.dispatchCommand(REDO_COMMAND, undefined);
      },
      key: 'redo',
      customDisabled: canRedo || isNodeSelection,
    },
  ];

  const buttonData: ButtonData[] = [
    {
      icon: <TextBold className="will-change-transform" />,
      onClick: () =>
        handleToolbarTextFormattingClick(
          editor,
          currentSelectionFormat,
          setCurrentSelectionFormat,
          'bold'
        ),
      key: 'bold',
    },
    {
      icon: <TextItalic className="will-change-transform" />,
      onClick: () =>
        handleToolbarTextFormattingClick(
          editor,
          currentSelectionFormat,
          setCurrentSelectionFormat,
          'italic'
        ),
      key: 'italic',
    },
    // {
    // 	icon: <TextUnderline className="will-change-transform" />,
    // 	onClick: () =>
    // 		handleToolbarTextFormattingClick(
    // 			editor,
    // 			currentSelectionFormat,
    // 			setCurrentSelectionFormat,
    // 			"underline",
    // 		),
    // 	key: "underline",
    // },
    {
      icon: <TextStrikethrough className="will-change-transform" />,
      onClick: () =>
        handleToolbarTextFormattingClick(
          editor,
          currentSelectionFormat,
          setCurrentSelectionFormat,
          'strikethrough'
        ),
      key: 'strikethrough',
    },
    {
      icon: <Subscript className="will-change-transform" />,
      onClick: () =>
        handleToolbarTextFormattingClick(
          editor,
          currentSelectionFormat,
          setCurrentSelectionFormat,
          'subscript'
        ),
      key: 'subscript',
    },
    {
      icon: <Superscript className="will-change-transform" />,
      onClick: () =>
        handleToolbarTextFormattingClick(
          editor,
          currentSelectionFormat,
          setCurrentSelectionFormat,
          'superscript'
        ),
      key: 'superscript',
    },
    {
      icon: <UnorderedList className="will-change-transform" />,
      onClick: () =>
        handleToolbarBlockElementClick(
          editor,
          'ul',
          currentBlockType,
          setCurrentBlockType
        ),
      key: 'ul',
    },
    {
      icon: <OrderedList className="will-change-transform" />,
      onClick: () =>
        handleToolbarBlockElementClick(
          editor,
          'ol',
          currentBlockType,
          setCurrentBlockType
        ),
      key: 'ol',
    },
    {
      icon: <ListCheckbox className="will-change-transform" />,
      onClick: () =>
        handleToolbarBlockElementClick(
          editor,
          'check',
          currentBlockType,
          setCurrentBlockType
        ),
      key: 'check',
    },
  ];

  if (setFloatingData) {
    buttonData.push({
      icon: <Link className="will-change-transform" />,
      onClick: () => {
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return;
          }
          const selectionNodes = selection.getNodes();
          let previousUrl: string | undefined;
          selectionNodes.forEach((node) => {
            const parent = node.getParent();
            if ($isLinkNode(parent)) {
              previousUrl = parent.getURL();
              return;
            }
          });
          setFloatingData((prev) => ({
            ...prev,
            isOpen: true,
            type: 'link',
            previousUrl,
          }));
        });
      },
      key: 'link',
    });
  }

  function getButtonsData() {
    if (shouldShowUndoRedo) {
      return [...undoRedoData, ...buttonData];
    }
    return buttonData;
  }

  const toolbarButtons = getButtonsData().map(
    ({ icon, onClick, key, customDisabled }, i) => {
      return (
        <div
          className="relative flex items-center justify-center px-[0.075rem] h-fit w-fit"
          key={key}
        >
          <AnimatePresence>
            {highlightedButton === i && (
              <SidebarHighlight layoutId={'toolbar-highlight'} />
            )}
          </AnimatePresence>
          <button
            onMouseEnter={() => setHighlightedButton(i)}
            onMouseLeave={() => setHighlightedButton(-1)}
            onClick={onClick}
            type="button"
            disabled={disabled || customDisabled}
            className={cn(
              'p-1.5 rounded-md transition-colors relative z-10',
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
        </div>
      );
    }
  );

  return (
    <span className="flex overflow-hidden items-center">{toolbarButtons}</span>
  );
}
