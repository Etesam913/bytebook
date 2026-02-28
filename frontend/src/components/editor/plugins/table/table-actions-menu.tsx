/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { ElementNode } from 'lexical';
import type { JSX } from 'react';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getNodeTriplet,
  $getTableCellNodeFromLexicalNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableSelection,
  $mergeCells,
  $unmergeCell,
  getTableElement,
  getTableObserverFromTableElement,
  TableCellNode,
  TableObserver,
  TableSelection,
} from '@lexical/table';
import { mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  getDOMSelection,
  isDOMNode,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import {
  ReactPortal,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from '../../../../icons/chevron-down';
import { TableColNewLeft2 } from '../../../../icons/table-col-new-left-2';
import { TableColNewRight2 } from '../../../../icons/table-col-new-right-2';
import { TableColsMinus2 } from '../../../../icons/table-cols-minus-2';
import { TableRowNewBottom2 } from '../../../../icons/table-row-new-bottom-2';
import { TableRowNewTop2 } from '../../../../icons/table-row-new-top-2';
import { TableRowsMinus2 } from '../../../../icons/table-rows-minus-2';
import { Trash } from '../../../../icons/trash';
import { DropdownMenu } from '../../../dropdown/dropdown-menu';
import type { DropdownItem } from '../../../../types';
import { MotionIconButton } from '../../../buttons';
import { getDefaultButtonVariants } from '../../../../animations';

function computeSelectionCount(selection: TableSelection): {
  columns: number;
  rows: number;
} {
  const selectionShape = selection.getShape();
  return {
    columns: selectionShape.toX - selectionShape.fromX + 1,
    rows: selectionShape.toY - selectionShape.fromY + 1,
  };
}

function $canUnmerge(): boolean {
  const selection = $getSelection();
  if (
    ($isRangeSelection(selection) && !selection.isCollapsed()) ||
    ($isTableSelection(selection) && !selection.anchor.is(selection.focus)) ||
    (!$isRangeSelection(selection) && !$isTableSelection(selection))
  ) {
    return false;
  }
  const [cell] = $getNodeTriplet(selection.anchor);
  return cell.__colSpan > 1 || cell.__rowSpan > 1;
}

function $selectLastDescendant(node: ElementNode): void {
  const lastDescendant = node.getLastDescendant();
  if ($isTextNode(lastDescendant)) {
    lastDescendant.select();
  } else if ($isElementNode(lastDescendant)) {
    lastDescendant.selectEnd();
  } else if (lastDescendant !== null) {
    lastDescendant.selectNext();
  }
}

type TableCellActionMenuProps = Readonly<{
  contextRef: { current: null | HTMLElement };
  onClose: () => void;
  setIsMenuOpen: (isOpen: boolean) => void;
  tableCellNode: TableCellNode;
  cellMerge: boolean;
}>;

function TableActionMenu({
  onClose,
  tableCellNode: _tableCellNode,
  setIsMenuOpen,
  contextRef,
  cellMerge,
}: TableCellActionMenuProps) {
  const [editor] = useLexicalComposerContext();
  const dropDownRef = useRef<HTMLDivElement | null>(null);
  const [tableCellNode, updateTableCellNode] = useState(_tableCellNode);
  const [selectionCounts, updateSelectionCounts] = useState({
    columns: 1,
    rows: 1,
  });
  const [canMergeCells, setCanMergeCells] = useState(false);
  const [canUnmergeCell, setCanUnmergeCell] = useState(false);

  useEffect(() => {
    return editor.registerMutationListener(
      TableCellNode,
      (nodeMutations) => {
        const nodeUpdated =
          nodeMutations.get(tableCellNode.getKey()) === 'updated';

        if (nodeUpdated) {
          editor.getEditorState().read(() => {
            updateTableCellNode(tableCellNode.getLatest());
          });
        }
      },
      { skipInitialization: true }
    );
  }, [editor, tableCellNode]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      // Merge cells
      if ($isTableSelection(selection)) {
        const currentSelectionCounts = computeSelectionCount(selection);
        updateSelectionCounts(computeSelectionCount(selection));
        setCanMergeCells(
          currentSelectionCounts.columns > 1 || currentSelectionCounts.rows > 1
        );
      }
      // Unmerge cell
      setCanUnmergeCell($canUnmerge());
    });
  }, [editor]);

  useEffect(() => {
    const menuButtonElement = contextRef.current;
    const dropDownElement = dropDownRef.current;
    const rootElement = editor.getRootElement();

    if (
      menuButtonElement != null &&
      dropDownElement != null &&
      rootElement != null
    ) {
      const rootEleRect = rootElement.getBoundingClientRect();
      const menuButtonRect = menuButtonElement.getBoundingClientRect();
      dropDownElement.style.opacity = '1';
      const dropDownElementRect = dropDownElement.getBoundingClientRect();
      const margin = 5;
      let leftPosition = menuButtonRect.right + margin;
      if (
        leftPosition + dropDownElementRect.width > window.innerWidth ||
        leftPosition + dropDownElementRect.width > rootEleRect.right
      ) {
        const position =
          menuButtonRect.left - dropDownElementRect.width - margin;
        leftPosition = (position < 0 ? margin : position) + window.pageXOffset;
      }
      dropDownElement.style.left = `${leftPosition + window.pageXOffset}px`;

      let topPosition = menuButtonRect.top;
      if (topPosition + dropDownElementRect.height > window.innerHeight) {
        const position = menuButtonRect.bottom - dropDownElementRect.height;
        topPosition = position < 0 ? margin : position;
      }
      dropDownElement.style.top = `${topPosition}px`;
    }
  }, [contextRef, dropDownRef, editor]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropDownRef.current != null &&
        contextRef.current != null &&
        isDOMNode(event.target) &&
        !dropDownRef.current.contains(event.target) &&
        !contextRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener('click', handleClickOutside);

    return () => window.removeEventListener('click', handleClickOutside);
  }, [setIsMenuOpen, contextRef]);

  const clearTableSelection = useCallback(() => {
    editor.update(() => {
      if (tableCellNode.isAttached()) {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        const tableElement = getTableElement(
          tableNode,
          editor.getElementByKey(tableNode.getKey())
        );

        if (tableElement === null) {
          throw new Error(
            'TableActionMenu: Expected to find tableElement in DOM'
          );
        }

        const tableObserver = getTableObserverFromTableElement(tableElement);
        if (tableObserver !== null) {
          tableObserver.$clearHighlight();
        }

        tableNode.markDirty();
        updateTableCellNode(tableCellNode.getLatest());
      }
      $setSelection(null);
    });
  }, [editor, tableCellNode]);

  const mergeTableCellsAtSelection = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isTableSelection(selection)) {
        return;
      }

      const nodes = selection.getNodes();
      const tableCells = nodes.filter($isTableCellNode);
      const targetCell = $mergeCells(tableCells);

      if (targetCell) {
        $selectLastDescendant(targetCell);
        onClose();
      }
    });
  };

  const unmergeTableCellsAtSelection = () => {
    editor.update(() => {
      $unmergeCell();
    });
  };

  const insertTableRowAtSelection = useCallback(
    (shouldInsertAfter: boolean) => {
      editor.update(() => {
        for (let i = 0; i < selectionCounts.rows; i++) {
          $insertTableRowAtSelection(shouldInsertAfter);
        }
        onClose();
      });
    },
    [editor, onClose, selectionCounts.rows]
  );

  const insertTableColumnAtSelection = useCallback(
    (shouldInsertAfter: boolean) => {
      editor.update(() => {
        for (let i = 0; i < selectionCounts.columns; i++) {
          $insertTableColumnAtSelection(shouldInsertAfter);
        }
        onClose();
      });
    },
    [editor, onClose, selectionCounts.columns]
  );

  const deleteTableRowAtSelection = useCallback(() => {
    editor.update(() => {
      $deleteTableRowAtSelection();
      onClose();
    });
  }, [editor, onClose]);

  const deleteTableAtSelection = useCallback(() => {
    editor.update(() => {
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
      tableNode.remove();

      clearTableSelection();
      onClose();
    });
  }, [editor, tableCellNode, clearTableSelection, onClose]);

  const deleteTableColumnAtSelection = useCallback(() => {
    editor.update(() => {
      $deleteTableColumnAtSelection();
      onClose();
    });
  }, [editor, onClose]);

  let mergeCellButton: null | JSX.Element = null;
  if (cellMerge) {
    if (canMergeCells) {
      mergeCellButton = (
        <button
          type="button"
          className="item"
          onClick={() => mergeTableCellsAtSelection()}
          data-test-id="table-merge-cells"
        >
          <span className="text">Merge cells</span>
        </button>
      );
    } else if (canUnmergeCell) {
      mergeCellButton = (
        <button
          type="button"
          className="item"
          onClick={() => unmergeTableCellsAtSelection()}
          data-test-id="table-unmerge-cells"
        >
          <span className="text">Unmerge cells</span>
        </button>
      );
    }
  }

  return createPortal(
    <div
      className="dropdown"
      ref={dropDownRef}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {mergeCellButton}
      {mergeCellButton && <hr />}
      <button
        type="button"
        className="item"
        onClick={() => insertTableRowAtSelection(false)}
        data-test-id="table-insert-row-above"
      >
        <span className="text">
          Insert{' '}
          {selectionCounts.rows === 1 ? 'row' : `${selectionCounts.rows} rows`}{' '}
          above
        </span>
      </button>
      <button
        type="button"
        className="item"
        onClick={() => insertTableRowAtSelection(true)}
        data-test-id="table-insert-row-below"
      >
        <span className="text">
          Insert{' '}
          {selectionCounts.rows === 1 ? 'row' : `${selectionCounts.rows} rows`}{' '}
          below
        </span>
      </button>
      <hr />
      <button
        type="button"
        className="item"
        onClick={() => insertTableColumnAtSelection(false)}
        data-test-id="table-insert-column-before"
      >
        <span className="text">
          Insert{' '}
          {selectionCounts.columns === 1
            ? 'column'
            : `${selectionCounts.columns} columns`}{' '}
          left
        </span>
      </button>
      <button
        type="button"
        className="item"
        onClick={() => insertTableColumnAtSelection(true)}
        data-test-id="table-insert-column-after"
      >
        <span className="text">
          Insert{' '}
          {selectionCounts.columns === 1
            ? 'column'
            : `${selectionCounts.columns} columns`}{' '}
          right
        </span>
      </button>
      <hr />
      <button
        type="button"
        className="item"
        onClick={() => deleteTableColumnAtSelection()}
        data-test-id="table-delete-columns"
      >
        <span className="text">Delete column</span>
      </button>
      <button
        type="button"
        className="item"
        onClick={() => deleteTableRowAtSelection()}
        data-test-id="table-delete-rows"
      >
        <span className="text">Delete row</span>
      </button>
      <button
        type="button"
        className="item"
        onClick={() => deleteTableAtSelection()}
        data-test-id="table-delete"
      >
        <span className="text">Delete table</span>
      </button>
      <hr />
    </div>,
    document.body
  );
}
void TableActionMenu;

function TableCellActionMenuContainer({
  anchorElem,
}: {
  anchorElem: HTMLElement;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const menuButtonRef = useRef<HTMLDivElement | null>(null);
  const menuRootRef = useRef<HTMLButtonElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [tableCellNode, setTableMenuCellNode] = useState<TableCellNode | null>(
    null
  );

  const checkTableCellOverflow = useCallback(
    (tableCellParentNodeDOM: HTMLElement): boolean => {
      const scrollableContainer = tableCellParentNodeDOM.closest(
        '.PlaygroundEditorTheme__tableScrollableWrapper'
      );
      if (scrollableContainer) {
        const containerRect = (
          scrollableContainer as HTMLElement
        ).getBoundingClientRect();
        const cellRect = tableCellParentNodeDOM.getBoundingClientRect();

        // Calculate where the action button would be positioned (5px from right edge of cell)
        // Also account for the button width and table cell padding (8px)
        const actionButtonRight = cellRect.right - 5;
        const actionButtonLeft = actionButtonRight - 28; // 20px width + 8px padding

        // Only hide if the action button would overflow the container
        if (
          actionButtonRight > containerRect.right ||
          actionButtonLeft < containerRect.left
        ) {
          return true;
        }
      }
      return false;
    },
    []
  );

  const $moveMenu = useCallback(() => {
    const menu = menuButtonRef.current;
    const selection = $getSelection();
    const nativeSelection = getDOMSelection(editor._window);
    const activeElement = document.activeElement;
    function disable() {
      if (menu) {
        menu.classList.remove('table-cell-action-button-container--active');
        menu.classList.add('table-cell-action-button-container--inactive');
      }
      setTableMenuCellNode(null);
    }

    if (selection == null || menu == null) {
      return disable();
    }

    const rootElement = editor.getRootElement();
    let tableObserver: TableObserver | null = null;
    let tableCellParentNodeDOM: HTMLElement | null = null;

    if (
      $isRangeSelection(selection) &&
      rootElement !== null &&
      nativeSelection !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const tableCellNodeFromSelection = $getTableCellNodeFromLexicalNode(
        selection.anchor.getNode()
      );

      if (tableCellNodeFromSelection == null) {
        return disable();
      }

      tableCellParentNodeDOM = editor.getElementByKey(
        tableCellNodeFromSelection.getKey()
      );

      if (
        tableCellParentNodeDOM == null ||
        !tableCellNodeFromSelection.isAttached()
      ) {
        return disable();
      }

      if (checkTableCellOverflow(tableCellParentNodeDOM)) {
        return disable();
      }

      const tableNode = $getTableNodeFromLexicalNodeOrThrow(
        tableCellNodeFromSelection
      );
      const tableElement = getTableElement(
        tableNode,
        editor.getElementByKey(tableNode.getKey())
      );

      if (tableElement === null) {
        throw new Error(
          'TableActionMenu: Expected to find tableElement in DOM'
        );
      }

      tableObserver = getTableObserverFromTableElement(tableElement);
      setTableMenuCellNode(tableCellNodeFromSelection);
    } else if ($isTableSelection(selection)) {
      const anchorNode = $getTableCellNodeFromLexicalNode(
        selection.anchor.getNode()
      );
      if (!$isTableCellNode(anchorNode)) {
        throw new Error('TableSelection anchorNode must be a TableCellNode');
      }
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(anchorNode);
      const tableElement = getTableElement(
        tableNode,
        editor.getElementByKey(tableNode.getKey())
      );
      if (tableElement === null) {
        throw new Error(
          'TableActionMenu: Expected to find tableElement in DOM'
        );
      }
      tableObserver = getTableObserverFromTableElement(tableElement);
      tableCellParentNodeDOM = editor.getElementByKey(anchorNode.getKey());

      if (tableCellParentNodeDOM === null) {
        return disable();
      }

      if (checkTableCellOverflow(tableCellParentNodeDOM)) {
        return disable();
      }
    } else if (!activeElement) {
      return disable();
    }
    if (tableObserver === null || tableCellParentNodeDOM === null) {
      return disable();
    }
    const enabled = !tableObserver || !tableObserver.isSelecting;
    menu.classList.toggle(
      'table-cell-action-button-container--active',
      enabled
    );
    menu.classList.toggle(
      'table-cell-action-button-container--inactive',
      !enabled
    );
    if (enabled) {
      const tableCellRect = tableCellParentNodeDOM.getBoundingClientRect();
      const anchorRect = anchorElem.getBoundingClientRect();
      const top = tableCellRect.top - anchorRect.top;
      const left = tableCellRect.right - anchorRect.left;
      menu.style.transform = `translate(${left}px, ${top}px)`;
    }
  }, [editor, anchorElem, checkTableCellOverflow]);

  useEffect(() => {
    // We call the $moveMenu callback every time the selection changes,
    // once up front, and once after each pointerUp
    let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;
    const callback = () => {
      timeoutId = undefined;
      editor.getEditorState().read($moveMenu);
    };
    const delayedCallback = () => {
      if (timeoutId === undefined) {
        timeoutId = setTimeout(callback, 0);
      }
      return false;
    };

    window.addEventListener('scroll', delayedCallback, true);
    window.addEventListener('resize', delayedCallback);

    return mergeRegister(
      editor.registerUpdateListener(delayedCallback),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        delayedCallback,
        COMMAND_PRIORITY_CRITICAL
      ),
      editor.registerRootListener((rootElement, prevRootElement) => {
        if (prevRootElement) {
          prevRootElement.removeEventListener('pointerup', delayedCallback);
        }
        if (rootElement) {
          rootElement.addEventListener('pointerup', delayedCallback);
          delayedCallback();
        }
      }),
      () => clearTimeout(timeoutId),
      () => {
        window.removeEventListener('scroll', delayedCallback, true);
        window.removeEventListener('resize', delayedCallback);
      }
    );
  }, [editor, $moveMenu]);

  const prevTableCellDOM = useRef(tableCellNode);

  useEffect(() => {
    if (prevTableCellDOM.current !== tableCellNode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsMenuOpen(false);
    }

    prevTableCellDOM.current = tableCellNode;
  }, [prevTableCellDOM, tableCellNode]);

  const dropdownItems = useMemo<DropdownItem[]>(
    () => [
      {
        value: 'insert-row-above',
        label: (
          <span className="flex items-center gap-3 px-1 py-0.5">
            <TableRowNewTop2 className="shrink-0" width={14} height={14} />
            Insert row above
          </span>
        ),
      },
      {
        value: 'insert-row-below',
        label: (
          <span className="flex items-center gap-3 px-1 py-0.5">
            <TableRowNewBottom2 className="shrink-0" width={14} height={14} />
            Insert row below
          </span>
        ),
      },
      {
        value: 'insert-column-left',
        label: (
          <span className="flex items-center gap-3 px-1 py-0.5">
            <TableColNewLeft2 className="shrink-0" width={14} height={14} />
            Insert column left
          </span>
        ),
      },
      {
        value: 'insert-column-right',
        label: (
          <span className="flex items-center gap-3 px-1 py-0.5">
            <TableColNewRight2 className="shrink-0" width={14} height={14} />
            Insert column right
          </span>
        ),
      },
      {
        value: 'delete-column',
        label: (
          <span className="flex items-center gap-2 px-1 py-0.5">
            <TableColsMinus2 className="shrink-0" width={18} height={18} />
            Delete column
          </span>
        ),
      },
      {
        value: 'delete-row',
        label: (
          <span className="flex items-center gap-2 px-1 py-0.5">
            <TableRowsMinus2 className="shrink-0" width={18} height={18} />
            Delete row
          </span>
        ),
      },
      {
        value: 'delete-table',
        label: (
          <span className="flex items-center gap-2 px-1 py-0.5">
            <Trash className="shrink-0" height={18} width={18} />
            Delete table
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="table-cell-action-button-container" ref={menuButtonRef}>
      {tableCellNode != null && (
        <DropdownMenu
          items={dropdownItems}
          isOpen={isMenuOpen}
          setIsOpen={setIsMenuOpen}
          dropdownClassName="w-56 right-0 top-4 font-display"
          skipAnimation
          onChange={(item) => {
            switch (item.value) {
              case 'insert-row-above':
                editor.update(() => {
                  $insertTableRowAtSelection(false);
                });
                break;
              case 'insert-row-below':
                editor.update(() => {
                  $insertTableRowAtSelection(true);
                });
                break;
              case 'insert-column-left':
                editor.update(() => {
                  $insertTableColumnAtSelection(false);
                });
                break;
              case 'insert-column-right':
                editor.update(() => {
                  $insertTableColumnAtSelection(true);
                });
                break;
              case 'delete-column':
                editor.update(() => {
                  $deleteTableColumnAtSelection();
                });
                break;
              case 'delete-row':
                editor.update(() => {
                  $deleteTableRowAtSelection();
                });
                break;
              case 'delete-table':
                editor.update(() => {
                  const tableNode =
                    $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
                  tableNode.remove();
                  $setSelection(null);
                });
                break;
              default:
                break;
            }
            setIsMenuOpen(false);
          }}
        >
          {({ buttonId, menuId, isOpen, handleKeyDown, handleClick }) => (
            <MotionIconButton
              id={buttonId}
              {...getDefaultButtonVariants()}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              aria-controls={isOpen ? menuId : undefined}
              type="button"
              className="table-cell-action-button"
              onKeyDown={handleKeyDown}
              onClick={(e) => {
                e.stopPropagation();
                handleClick(e);
              }}
              ref={menuRootRef}
            >
              <ChevronDown />
            </MotionIconButton>
          )}
        </DropdownMenu>
      )}
    </div>
  );
}

export default function TableActionMenuPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
  cellMerge?: boolean;
}): null | ReactPortal {
  const isEditable = useLexicalEditable();

  return createPortal(
    isEditable ? (
      <TableCellActionMenuContainer anchorElem={anchorElem} />
    ) : null,
    anchorElem
  );
}
