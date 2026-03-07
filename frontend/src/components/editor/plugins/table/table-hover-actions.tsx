/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { JSX } from 'react';
import {
  autoUpdate,
  offset,
  shift,
  useFloating,
  type VirtualElement,
} from '@floating-ui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import {
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
} from '@lexical/table';
import { $getNearestNodeFromDOMNode, isHTMLElement } from 'lexical';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TableColNewRight2 } from '../../../../icons/table-col-new-right-2';
import { MotionIconButton } from '../../../buttons';
import { getDefaultButtonVariants } from '../../../../animations';
import { motion } from 'motion/react';
import { TableRowNewBottom2 } from '../../../../icons/table-row-new-bottom-2';
import { Tooltip } from '../../../tooltip';

const INDICATOR_SIZE_PX = 18;
const SIDE_INDICATOR_SIZE_PX = 18;
const TOP_BUTTON_OVERHANG = INDICATOR_SIZE_PX / 2;
const LEFT_BUTTON_OVERHANG = SIDE_INDICATOR_SIZE_PX / 2;

function getTableFromMouseEvent(event: MouseEvent): {
  isOutside: boolean;
  tableElement: HTMLTableElement | null;
} {
  if (!isHTMLElement(event.target)) {
    return { isOutside: true, tableElement: null };
  }

  const cellSelector = `td, th`;
  const cell = event.target.closest<HTMLTableCellElement>(cellSelector);
  const tableElement = cell?.closest<HTMLTableElement>('table') ?? null;

  return {
    isOutside: tableElement == null,
    tableElement,
  };
}

function getClosestTopCellPosition(
  tableElement: HTMLTableElement,
  clientX: number
): { centerX: number; top: number; cell: HTMLTableCellElement } | null {
  const firstRow = tableElement.rows[0];
  if (!firstRow) {
    return null;
  }

  let closest: {
    cell: HTMLTableCellElement;
    centerX: number;
    top: number;
  } | null = null;
  let smallestDelta = Number.POSITIVE_INFINITY;

  for (const cell of Array.from(firstRow.cells)) {
    const rect = cell.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const delta = Math.abs(centerX - clientX);
    if (delta < smallestDelta) {
      smallestDelta = delta;
      closest = { cell, centerX, top: rect.top };
    }
  }

  return closest;
}

function getTopAnchorRectFromCell(cell: HTMLTableCellElement): DOMRect {
  const rect = cell.getBoundingClientRect();
  return new DOMRect(rect.left + rect.width / 2, rect.top, 0, 0);
}

function getLeftAnchorRectFromCell(cell: HTMLTableCellElement): DOMRect {
  const tableElement = cell.closest('table');
  const cellRect = cell.getBoundingClientRect();
  const tableRect = tableElement?.getBoundingClientRect();
  return new DOMRect(
    tableRect?.left ?? cellRect.left,
    cellRect.top + cellRect.height / 2,
    0,
    0
  );
}

function TableHoverActionsV2({
  anchorElem,
}: {
  anchorElem: HTMLElement;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();
  const [isVisible, setIsVisible] = useState(false);
  const [isLeftVisible, setIsLeftVisible] = useState(false);
  const virtualRef = useRef<VirtualElement>({
    getBoundingClientRect: () => new DOMRect(),
  });
  const leftVirtualRef = useRef<VirtualElement>({
    getBoundingClientRect: () => new DOMRect(),
  });
  const floatingElemRef = useRef<HTMLElement | null>(null);
  const leftFloatingElemRef = useRef<HTMLElement | null>(null);
  const hoveredLeftCellRef = useRef<HTMLTableCellElement | null>(null);
  const hoveredTopCellRef = useRef<HTMLTableCellElement | null>(null);
  const handleMouseLeaveRef = useRef<((event: MouseEvent) => void) | null>(
    null
  );

  const { refs, floatingStyles, update } = useFloating({
    middleware: [
      offset({ mainAxis: -TOP_BUTTON_OVERHANG }),
      shift({
        padding: 8,
      }),
    ],
    placement: 'top',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });

  const {
    refs: leftRefs,
    floatingStyles: leftFloatingStyles,
    update: updateLeft,
  } = useFloating({
    middleware: [
      offset({ mainAxis: -LEFT_BUTTON_OVERHANG }),
      shift({
        padding: 8,
      }),
    ],
    placement: 'left',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (!isEditable) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (
        (floatingElemRef.current &&
          event.target instanceof Node &&
          floatingElemRef.current.contains(event.target)) ||
        (leftFloatingElemRef.current &&
          event.target instanceof Node &&
          leftFloatingElemRef.current.contains(event.target))
      ) {
        return;
      }

      const { tableElement, isOutside } = getTableFromMouseEvent(event);

      if (
        isOutside ||
        tableElement == null ||
        (anchorElem && !anchorElem.contains(tableElement))
      ) {
        setIsVisible(false);
        setIsLeftVisible(false);
        return;
      }

      const cellSelector = `td, th`;
      const hoveredCell = isHTMLElement(event.target)
        ? event.target.closest<HTMLTableCellElement>(cellSelector)
        : null;

      if (!hoveredCell) {
        setIsVisible(false);
        setIsLeftVisible(false);
        hoveredTopCellRef.current = null;
        hoveredLeftCellRef.current = null;
        return;
      }

      const rowIndex =
        hoveredCell.parentElement instanceof HTMLTableRowElement
          ? hoveredCell.parentElement.rowIndex
          : -1;
      const colIndex = hoveredCell.cellIndex ?? -1;

      const closestTopCell = getClosestTopCellPosition(
        tableElement,
        event.clientX
      );

      if (!closestTopCell || rowIndex !== 0) {
        setIsVisible(false);
        hoveredTopCellRef.current = null;
      } else {
        hoveredTopCellRef.current = closestTopCell.cell;
        virtualRef.current.getBoundingClientRect = () =>
          hoveredTopCellRef.current
            ? getTopAnchorRectFromCell(hoveredTopCellRef.current)
            : new DOMRect();
        refs.setPositionReference(virtualRef.current);
        setIsVisible(true);
        update?.();
      }

      if (colIndex !== 0) {
        setIsLeftVisible(false);
        hoveredLeftCellRef.current = null;
      } else {
        hoveredLeftCellRef.current = hoveredCell;
        leftVirtualRef.current.getBoundingClientRect = () =>
          hoveredLeftCellRef.current
            ? getLeftAnchorRectFromCell(hoveredLeftCellRef.current)
            : new DOMRect();
        leftRefs.setPositionReference(leftVirtualRef.current);
        setIsLeftVisible(true);
        updateLeft?.();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      setIsVisible(false);
      setIsLeftVisible(false);
    };
  }, [anchorElem, isEditable, leftRefs, refs, update, updateLeft]);

  useEffect(() => {
    if (!isVisible && !isLeftVisible) {
      return;
    }

    const handleReposition = () => {
      update?.();
      updateLeft?.();
    };

    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isLeftVisible, isVisible, update, updateLeft]);

  useEffect(() => {
    const handleMouseLeave = (event: MouseEvent) => {
      const nextTarget = event.relatedTarget;
      if (
        nextTarget &&
        floatingElemRef.current &&
        floatingElemRef.current.contains(nextTarget as Node)
      ) {
        return;
      }
      if (
        nextTarget &&
        leftFloatingElemRef.current &&
        leftFloatingElemRef.current.contains(nextTarget as Node)
      ) {
        return;
      }
      setIsVisible(false);
      setIsLeftVisible(false);
    };
    handleMouseLeaveRef.current = handleMouseLeave;

    return editor.registerRootListener((rootElement, prevRootElement) => {
      if (prevRootElement && handleMouseLeaveRef.current) {
        prevRootElement.removeEventListener(
          'mouseleave',
          handleMouseLeaveRef.current
        );
      }
      if (rootElement && handleMouseLeaveRef.current) {
        rootElement.addEventListener('mouseleave', handleMouseLeaveRef.current);
      }
    });
  }, [editor]);

  if (!isEditable) {
    return null;
  }

  const handleAddColumn = () => {
    const targetCell = hoveredTopCellRef.current;
    if (!targetCell) {
      return;
    }
    editor.update(() => {
      const maybeCellNode = $getNearestNodeFromDOMNode(targetCell);
      if ($isTableCellNode(maybeCellNode)) {
        maybeCellNode.selectEnd();
        $insertTableColumnAtSelection();
      }
    });
  };

  const handleAddRow = () => {
    const targetCell = hoveredLeftCellRef.current;
    if (!targetCell) {
      return;
    }
    editor.update(() => {
      const maybeCellNode = $getNearestNodeFromDOMNode(targetCell);
      if ($isTableCellNode(maybeCellNode)) {
        maybeCellNode.selectEnd();
        $insertTableRowAtSelection();
      }
    });
  };

  return (
    <>
      <motion.div
        ref={(node) => {
          floatingElemRef.current = node;
          refs.setFloating(node);
        }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: isVisible ? 1 : 0,
          transition: {
            duration: 0.15,
            ease: 'easeInOut',
          },
        }}
        style={{
          ...floatingStyles,
          visibility: isVisible ? 'visible' : 'hidden',
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
        className="flex items-center gap-1 relative"
      >
        <Tooltip content="Add column to the right" disabled={!isVisible}>
          <MotionIconButton
            className="z-10 text-zinc-600 bg-zinc-50 dark:bg-zinc-750 dark:border-zinc-600 dark:text-zinc-300 border-zinc-200 border"
            aria-label="Add column"
            type="button"
            onClick={handleAddColumn}
            {...getDefaultButtonVariants()}
          >
            <TableColNewRight2
              width={14}
              height={14}
              className="will-change-transform"
            />
          </MotionIconButton>
        </Tooltip>
      </motion.div>

      <motion.div
        ref={(node) => {
          leftFloatingElemRef.current = node;
          leftRefs.setFloating(node);
        }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: isLeftVisible ? 1 : 0,
          transition: {
            duration: 0.15,
            ease: 'easeInOut',
          },
        }}
        style={{
          ...leftFloatingStyles,
          visibility: isLeftVisible ? 'visible' : 'hidden',
          pointerEvents: isLeftVisible ? 'auto' : 'none',
        }}
      >
        <Tooltip content="Add row below" disabled={!isLeftVisible}>
          <MotionIconButton
            className="z-10 text-zinc-600 bg-zinc-50 dark:bg-zinc-750 dark:border-zinc-600 dark:text-zinc-300 border-zinc-200 border"
            aria-label="Add row"
            type="button"
            onClick={handleAddRow}
            {...getDefaultButtonVariants()}
          >
            <TableRowNewBottom2
              width={14}
              height={14}
              className="will-change-transform"
            />
          </MotionIconButton>
        </Tooltip>
      </motion.div>
    </>
  );
}

export default function TableHoverActionsV2Plugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): React.ReactPortal | null {
  const isEditable = useLexicalEditable();

  return isEditable
    ? createPortal(<TableHoverActionsV2 anchorElem={anchorElem} />, anchorElem)
    : null;
}
