/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { $isAtNodeEnd } from '@lexical/selection';
import { ElementNode, RangeSelection, TextNode } from 'lexical';

/**
 * Gets the selected node from a RangeSelection based on anchor and focus positions.
 * If anchor and focus are on the same node, returns that node.
 * Otherwise, determines which node to return based on selection direction and node end positions.
 * @param selection The RangeSelection to get the selected node from
 * @returns The selected TextNode or ElementNode
 */
export function getSelectedNode(
  selection: RangeSelection
): TextNode | ElementNode {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  const isBackward = selection.isBackward();
  if (isBackward) {
    return $isAtNodeEnd(focus) ? anchorNode : focusNode;
  } else {
    return $isAtNodeEnd(anchor) ? anchorNode : focusNode;
  }
}

const VERTICAL_GAP = 10;
const HORIZONTAL_OFFSET = 5;

/**
 * Positions a floating element (like a link editor) relative to a target element.
 * Adjusts the position to keep the floating element within the viewport and
 * handles edge cases like when the target is not available.
 *
 * @param targetRect - The DOMRect of the target element to position relative to
 * @param floatingElem - The floating element to position
 * @param anchorElem - The anchor element used as reference for positioning
 * @param verticalGap - Vertical gap between target and floating element (default: VERTICAL_GAP)
 * @param horizontalOffset - Horizontal offset from target (default: HORIZONTAL_OFFSET)
 */
export function setFloatingElemPositionForLinkEditor(
  targetRect: DOMRect | null,
  floatingElem: HTMLElement,
  anchorElem: HTMLElement,
  verticalGap: number = VERTICAL_GAP,
  horizontalOffset: number = HORIZONTAL_OFFSET
): void {
  const scrollerElem = anchorElem.parentElement;

  if (targetRect === null || !scrollerElem) {
    floatingElem.style.opacity = '0';
    floatingElem.style.transform = 'translate(-10000px, -10000px)';
    return;
  }

  const floatingElemRect = floatingElem.getBoundingClientRect();
  const anchorElementRect = anchorElem.getBoundingClientRect();
  const editorScrollerRect = scrollerElem.getBoundingClientRect();

  let top = targetRect.top - verticalGap;
  let left = targetRect.left - horizontalOffset;

  if (top < editorScrollerRect.top) {
    top += floatingElemRect.height + targetRect.height + verticalGap * 2;
  }

  if (left + floatingElemRect.width > editorScrollerRect.right) {
    left = editorScrollerRect.right - floatingElemRect.width - horizontalOffset;
  }

  top -= anchorElementRect.top;
  left -= anchorElementRect.left;

  floatingElem.style.opacity = '1';
  floatingElem.style.transform = `translate(${left}px, ${top}px)`;
}
