import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { REDO_COMMAND, type TextFormatType, UNDO_COMMAND } from 'lexical';
import { type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Button } from 'react-aria-components/Button';
import { ToggleButton } from 'react-aria-components/ToggleButton';
import { Toolbar } from 'react-aria-components/Toolbar';
import { ListCheckbox } from '@/icons/list-checkbox';
import { OrderedList } from '@/icons/ordered-list';
import { Redo } from '@/icons/redo';
import { TextBold } from '@/icons/text-bold';
import { TextItalic } from '@/icons/text-italic';
import { TextStrikethrough } from '@/icons/text-strikethrough';
import { Undo } from '@/icons/undo';
import { UnorderedList } from '@/icons/unordered-list';
import type { EditorBlockTypes } from '@/types';
import { cn } from '@utils/string-formatting';
import {
  handleToolbarBlockElementClick,
  handleToolbarTextFormattingClick,
} from '@components/editor/utils/toolbar';
import { Link } from '@/icons/link';
import { OPEN_LINK_EDITOR_COMMAND } from '@components/editor/nodes/link';
import { Tooltip } from '@components/tooltip';

const buttonClasses =
  'p-1.5 rounded-md relative z-10 outline-none focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-650 hover:bg-zinc-100 dark:hover:bg-zinc-650 disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-0';

type ToggleItem = {
  icon: ReactNode;
  key: TextFormatType | 'ul' | 'ol' | 'check';
  tooltip: string;
  shortcut?: string;
  isSelected: boolean;
  onToggle: () => void;
};

type ActionItem = {
  icon: ReactNode;
  key: string;
  tooltip: string;
  shortcut?: string;
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
  shouldShowLinkAction,
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
  shouldShowLinkAction?: boolean;
}) {
  const [editor] = useLexicalComposerContext();

  const undoRedoActions: ActionItem[] = [
    {
      icon: <Undo />,
      key: 'undo',
      tooltip: 'Undo',
      shortcut: '⌘Z',
      onPress: () => editor.dispatchCommand(UNDO_COMMAND, undefined),
      isDisabled: !canUndo || isNodeSelection,
    },
    {
      icon: <Redo />,
      key: 'redo',
      tooltip: 'Redo',
      shortcut: '⌘⇧Z',
      onPress: () => editor.dispatchCommand(REDO_COMMAND, undefined),
      isDisabled: !canRedo || isNodeSelection,
    },
  ];

  const textFormatItems: ToggleItem[] = (
    [
      { icon: <TextBold />, key: 'bold', tooltip: 'Bold', shortcut: '⌘B' },
      {
        icon: <TextItalic />,
        key: 'italic',
        tooltip: 'Italic',
        shortcut: '⌘I',
      },
      {
        icon: <TextStrikethrough />,
        key: 'strikethrough',
        tooltip: 'Strikethrough',
        shortcut: '⌘⇧X',
      },
    ] as const
  ).map(({ icon, key, tooltip, shortcut }) => ({
    icon,
    key,
    tooltip,
    shortcut,
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

  const linkAction: ActionItem | null = shouldShowLinkAction
    ? {
        icon: <Link />,
        key: 'link',
        tooltip: 'Insert Link',
        shortcut: '⌘K',
        onPress: () => {
          editor.dispatchCommand(OPEN_LINK_EDITOR_COMMAND, undefined);
        },
      }
    : null;

  const DISABLED_FORMATTING_MESSAGE = 'Click inside note text to format';

  function renderAction({
    icon,
    key,
    tooltip,
    shortcut,
    onPress,
    isDisabled,
  }: ActionItem) {
    const itemDisabled = disabled || isDisabled;
    const tooltipContent = disabled
      ? `${tooltip} — ${DISABLED_FORMATTING_MESSAGE}`
      : tooltip;

    return (
      <Tooltip
        key={key}
        content={tooltipContent}
        shortcut={shortcut}
        delay={{ open: 450 }}
        showWhenDisabled={itemDisabled}
      >
        <Button
          onPress={onPress}
          isDisabled={itemDisabled}
          aria-label={shortcut ? `${tooltip} (${shortcut})` : tooltip}
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
    shortcut,
    isSelected,
    onToggle,
  }: ToggleItem) {
    const tooltipContent = disabled
      ? `${tooltip} — ${DISABLED_FORMATTING_MESSAGE}`
      : tooltip;

    return (
      <Tooltip
        key={key}
        content={tooltipContent}
        shortcut={shortcut}
        delay={{ open: 450 }}
        showWhenDisabled={disabled}
      >
        <ToggleButton
          isSelected={isSelected && !disabled}
          onChange={onToggle}
          isDisabled={disabled}
          aria-label={shortcut ? `${tooltip} (${shortcut})` : tooltip}
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
