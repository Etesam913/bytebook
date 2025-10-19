import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  type LexicalEditor,
  $getSelection,
  $isRangeSelection,
  $setSelection,
} from 'lexical';
import {
  $deleteTableRowAtSelection,
  $deleteTableColumnAtSelection,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableCellNodeFromLexicalNode,
  $isTableSelection,
} from '@lexical/table';
import {
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  type TableCellNode,
} from '@lexical/table';
import { type RefObject, useState } from 'react';
import { MotionIconButton } from '../../buttons';
import { ChevronDown } from '../../../icons/chevron-down';
import { getDefaultButtonVariants } from '../../../animations';
import { DropdownMenu } from '../../dropdown/dropdown-menu';
import type { DropdownItem } from '../../../types';

/**
 * Generates menu items for table cell actions
 * Includes insert/delete rows/columns and table deletion
 */
function getTableActionMenuItems({
  editor,
  onClose,
}: {
  editor: LexicalEditor;
  onClose: () => void;
}): DropdownItem[] {
  const insertRowAbove = () => {
    editor.update(() => {
      $insertTableRowAtSelection(false);
      onClose();
    });
  };

  const insertRowBelow = () => {
    editor.update(() => {
      $insertTableRowAtSelection(true);
      onClose();
    });
  };

  const insertColumnLeft = () => {
    editor.update(() => {
      $insertTableColumnAtSelection(false);
      onClose();
    });
  };

  const insertColumnRight = () => {
    editor.update(() => {
      $insertTableColumnAtSelection(true);
      onClose();
    });
  };

  const deleteRow = () => {
    editor.update(() => {
      $deleteTableRowAtSelection();
      onClose();
    });
  };

  const deleteColumn = () => {
    editor.update(() => {
      $deleteTableColumnAtSelection();
      onClose();
    });
  };

  const deleteTable = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (
        selection &&
        ($isRangeSelection(selection) || $isTableSelection(selection))
      ) {
        const tableCellNode = $getTableCellNodeFromLexicalNode(
          selection.anchor.getNode()
        );
        if (tableCellNode) {
          const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
          tableNode.remove();
          $setSelection(null);
        }
      }
      onClose();
    });
  };

  return [
    {
      label: <span className="px-2 py-1">Insert row above</span>,
      value: 'insert-row-above',
      onChange: insertRowAbove,
    },
    {
      label: <span className="px-2 py-1">Insert row below</span>,
      value: 'insert-row-below',
      onChange: insertRowBelow,
    },
    {
      label: <span className="px-2 py-1">Insert column left</span>,
      value: 'insert-column-left',
      onChange: insertColumnLeft,
    },
    {
      label: <span className="px-2 py-1">Insert column right</span>,
      value: 'insert-column-right',
      onChange: insertColumnRight,
    },
    {
      label: <span className="px-2 py-1">Delete row</span>,
      value: 'delete-row',
      onChange: deleteRow,
    },
    {
      label: <span className="px-2 py-1">Delete column</span>,
      value: 'delete-column',
      onChange: deleteColumn,
    },
    {
      label: <span className="px-2 py-1">Delete table</span>,
      value: 'delete-table',
      onChange: deleteTable,
    },
  ];
}
export function TableActionsPlugin({
  ref,
}: {
  ref: RefObject<HTMLButtonElement | null>;
}) {
  const [editor] = useLexicalComposerContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tableCellNode, setTableCellNode] = useState<TableCellNode | null>(
    null
  );
  const [menuItems, setMenuItems] = useState<DropdownItem[]>(
    getTableActionMenuItems({ editor, onClose: () => {} })
  );

  return (
    <DropdownMenu
      items={menuItems}
      isOpen={isMenuOpen}
      setIsOpen={setIsMenuOpen}
      dropdownClassName="w-fit text-sm font-sans"
      id="table-actions"
    >
      {({ handleClick, handleKeyDown }) => (
        <MotionIconButton
          {...getDefaultButtonVariants({
            disabled: false,
            whileHover: 1.075,
            whileTap: 0.95,
            whileFocus: 1.075,
          })}
          className="absolute p-0.75 top-0 border border-zinc-200 dark:border-zinc-700 right-0 mt-1 mr-1 z-10 bg-zinc-50 dark:bg-zinc-750"
          onClick={(e) => {
            e.stopPropagation();
            handleClick(e);
          }}
          onKeyDown={handleKeyDown}
          ref={ref}
        >
          <ChevronDown strokeWidth="2px" />
        </MotionIconButton>
      )}
    </DropdownMenu>
  );
}
