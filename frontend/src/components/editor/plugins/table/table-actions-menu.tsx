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
import type { Key } from 'react-aria-components';
import { Button } from 'react-aria-components';
import { ChevronDown } from '../../../../icons/chevron-down';
import { TableColNewLeft2 } from '../../../../icons/table-col-new-left-2';
import { TableColNewRight2 } from '../../../../icons/table-col-new-right-2';
import { TableColsMinus2 } from '../../../../icons/table-cols-minus-2';
import { TableRowNewBottom2 } from '../../../../icons/table-row-new-bottom-2';
import { TableRowNewTop2 } from '../../../../icons/table-row-new-top-2';
import { TableRowsMinus2 } from '../../../../icons/table-rows-minus-2';
import { Trash } from '../../../../icons/trash';
import {
  AppMenu,
  AppMenuItem,
  AppMenuPopover,
  AppMenuTrigger,
} from '../../../menu';

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
void $selectLastDescendant;

function TableCellActionMenuContainer({
  anchorElem,
}: {
  anchorElem: HTMLElement;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const menuButtonRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [tableCellNode, setTableMenuCellNode] = useState<TableCellNode | null>(
    null
  );

  const [canMergeCells, setCanMergeCells] = useState(false);
  const [canUnmergeCell, setCanUnmergeCell] = useState(false);

  useEffect(() => {
    if (!tableCellNode) return;
    return editor.registerMutationListener(
      TableCellNode,
      (nodeMutations) => {
        const nodeUpdated =
          nodeMutations.get(tableCellNode.getKey()) === 'updated';

        if (nodeUpdated) {
          editor.getEditorState().read(() => {
            setTableMenuCellNode(tableCellNode.getLatest());
          });
        }
      },
      { skipInitialization: true }
    );
  }, [editor, tableCellNode]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isTableSelection(selection)) {
        const currentSelectionCounts = computeSelectionCount(selection);
        setCanMergeCells(
          currentSelectionCounts.columns > 1 || currentSelectionCounts.rows > 1
        );
      }
      setCanUnmergeCell($canUnmerge());
    });
  }, [editor]);

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

        const actionButtonRight = cellRect.right - 5;
        const actionButtonLeft = actionButtonRight - 28;

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

  const dropdownItems = useMemo(
    () => [
      {
        id: 'insert-row-above',
        label: (
          <span className="flex items-center gap-3 px-1 py-0.5">
            <TableRowNewTop2
              className="shrink-0"
              width="0.875rem"
              height="0.875rem"
            />
            Insert row above
          </span>
        ),
      },
      {
        id: 'insert-row-below',
        label: (
          <span className="flex items-center gap-3 px-1 py-0.5">
            <TableRowNewBottom2
              className="shrink-0"
              width="0.875rem"
              height="0.875rem"
            />
            Insert row below
          </span>
        ),
      },
      {
        id: 'insert-column-left',
        label: (
          <span className="flex items-center gap-3 px-1 py-0.5">
            <TableColNewLeft2
              className="shrink-0"
              width="0.875rem"
              height="0.875rem"
            />
            Insert column left
          </span>
        ),
      },
      {
        id: 'insert-column-right',
        label: (
          <span className="flex items-center gap-3 px-1 py-0.5">
            <TableColNewRight2
              className="shrink-0"
              width="0.875rem"
              height="0.875rem"
            />
            Insert column right
          </span>
        ),
      },
      {
        id: 'delete-column',
        label: (
          <span className="flex items-center gap-2 px-1 py-0.5">
            <TableColsMinus2
              className="shrink-0"
              width="1.125rem"
              height="1.125rem"
            />
            Delete column
          </span>
        ),
      },
      {
        id: 'delete-row',
        label: (
          <span className="flex items-center gap-2 px-1 py-0.5">
            <TableRowsMinus2
              className="shrink-0"
              width="1.125rem"
              height="1.125rem"
            />
            Delete row
          </span>
        ),
      },
      {
        id: 'delete-table',
        label: (
          <span className="flex items-center gap-2 px-1 py-0.5">
            <Trash className="shrink-0" height="1.125rem" width="1.125rem" />
            Delete table
          </span>
        ),
      },
    ],
    []
  );

  function handleAction(key: Key) {
    switch (key) {
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
          const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode!);
          tableNode.remove();
          $setSelection(null);
        });
        break;
    }
    setIsMenuOpen(false);
  }

  return (
    <div className="table-cell-action-button-container" ref={menuButtonRef}>
      {tableCellNode != null && (
        <AppMenuTrigger isOpen={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <Button
            aria-label="Table cell actions"
            className="table-cell-action-button outline-hidden"
            onPress={(e) => {
              // Stop propagation like the original
              e.continuePropagation();
            }}
          >
            <ChevronDown />
          </Button>
          <AppMenuPopover className="w-56">
            <AppMenu onAction={handleAction}>
              {canMergeCells && (
                <AppMenuItem
                  id="merge-cells"
                  onAction={() => {
                    editor.update(() => {
                      const selection = $getSelection();
                      if (!$isTableSelection(selection)) return;
                      const nodes = selection.getNodes();
                      const tableCells = nodes.filter($isTableCellNode);
                      const targetCell = $mergeCells(tableCells);
                      if (targetCell) {
                        $selectLastDescendant(targetCell);
                      }
                    });
                    setIsMenuOpen(false);
                  }}
                >
                  <span className="text">Merge cells</span>
                </AppMenuItem>
              )}
              {canUnmergeCell && (
                <AppMenuItem
                  id="unmerge-cells"
                  onAction={() => {
                    editor.update(() => {
                      $unmergeCell();
                    });
                    setIsMenuOpen(false);
                  }}
                >
                  <span className="text">Unmerge cells</span>
                </AppMenuItem>
              )}
              {dropdownItems.map((item) => (
                <AppMenuItem key={item.id} id={item.id}>
                  {item.label}
                </AppMenuItem>
              ))}
            </AppMenu>
          </AppMenuPopover>
        </AppMenuTrigger>
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
