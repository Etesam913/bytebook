import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  REDO_COMMAND,
  type TextFormatType,
  UNDO_COMMAND,
} from 'lexical';
import { type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Button, ToggleButton, Toolbar } from 'react-aria-components';
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

const buttonClasses =
  'p-1.5 rounded-md relative z-10 outline-none focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-650 hover:bg-zinc-100 dark:hover:bg-zinc-650 disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-0';

type ToggleItem = {
  icon: ReactNode;
  key: TextFormatType | 'ul' | 'ol' | 'check';
  tooltip: string;
  isSelected: boolean;
  onToggle: () => void;
};

type ActionItem = {
  icon: ReactNode;
  key: string;
  tooltip: string;
  onPress: () => void;
  isDisabled?: boolean;
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

  const undoRedoActions: ActionItem[] = [
    {
      icon: <Undo />,
      key: 'undo',
      tooltip: 'Undo',
      onPress: () => editor.dispatchCommand(UNDO_COMMAND, undefined),
      isDisabled: canUndo || isNodeSelection,
    },
    {
      icon: <Redo />,
      key: 'redo',
      tooltip: 'Redo',
      onPress: () => editor.dispatchCommand(REDO_COMMAND, undefined),
      isDisabled: canRedo || isNodeSelection,
    },
  ];

  const textFormatItems: ToggleItem[] = (
    [
      { icon: <TextBold />, key: 'bold', tooltip: 'Bold (⌘B)' },
      { icon: <TextItalic />, key: 'italic', tooltip: 'Italic (⌘I)' },
      {
        icon: <TextStrikethrough />,
        key: 'strikethrough',
        tooltip: 'Strikethrough (⌘⇧X)',
      },
    ] as const
  ).map(({ icon, key, tooltip }) => ({
    icon,
    key,
    tooltip,
    isSelected: currentSelectionFormat.includes(key as TextFormatType),
    onToggle: () =>
      handleToolbarTextFormattingClick({
        editor,
        currentSelectionFormat,
        setCurrentSelectionFormat,
        textFormat: key as TextFormatType,
      }),
  }));

  const blockTypeItems: ToggleItem[] = (
    [
      { icon: <UnorderedList />, key: 'ul', tooltip: 'Bullet List' },
      { icon: <OrderedList />, key: 'ol', tooltip: 'Numbered List' },
      { icon: <ListCheckbox />, key: 'check', tooltip: 'Checklist' },
    ] as const
  ).map(({ icon, key, tooltip }) => ({
    icon,
    key,
    tooltip,
    isSelected: key === currentBlockType,
    onToggle: () =>
      handleToolbarBlockElementClick({
        editor,
        block: key,
        currentBlockType,
        setCurrentBlockType,
      }),
  }));

  const linkAction: ActionItem | null = setFloatingData
    ? {
        icon: <Link />,
        key: 'link',
        tooltip: 'Insert Link',
        onPress: () => {
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
      }
    : null;

  function renderAction({
    icon,
    key,
    tooltip,
    onPress,
    isDisabled,
  }: ActionItem) {
    const itemDisabled = disabled || isDisabled;
    return (
      <Tooltip
        key={key}
        content={tooltip}
        disabled={itemDisabled}
        delay={{ open: 450 }}
      >
        <Button
          onPress={onPress}
          isDisabled={itemDisabled}
          aria-label={tooltip}
          className={buttonClasses}
        >
          {icon}
        </Button>
      </Tooltip>
    );
  }

  function renderToggle({
    icon,
    key,
    tooltip,
    isSelected,
    onToggle,
  }: ToggleItem) {
    return (
      <Tooltip
        key={key}
        content={tooltip}
        disabled={disabled}
        delay={{ open: 450 }}
      >
        <ToggleButton
          isSelected={isSelected && !disabled}
          onChange={onToggle}
          isDisabled={disabled}
          aria-label={tooltip}
          className={({ isSelected: selected, isDisabled }) =>
            cn(buttonClasses, selected && !isDisabled && 'button-invert')
          }
        >
          {icon}
        </ToggleButton>
      </Tooltip>
    );
  }

  return (
    <Toolbar
      aria-label="Editor formatting"
      className="flex overflow-hidden items-center gap-[0.15rem]"
    >
      {shouldShowUndoRedo && undoRedoActions.map(renderAction)}
      {textFormatItems.map(renderToggle)}
      {blockTypeItems.map(renderToggle)}
      {linkAction && renderAction(linkAction)}
    </Toolbar>
  );
}
