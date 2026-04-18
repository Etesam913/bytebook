import { calculateZoomLevel } from '@lexical/utils';
import { $getRoot, type LexicalEditor } from 'lexical';
import { Downward, Indeterminate, Upward } from './constants';
import { Point, Rect } from './geometry';

/**
 * Remembers the last matching block index so the next search can start near
 * it instead of always from the middle.
 */
let prevIndex = Number.POSITIVE_INFINITY;

/**
 * Returns the index to begin searching from in the list of root block keys.
 * Falls back to the middle of the list when the cached index is stale.
 */
function getCurrentIndex(keysLength: number): number {
  if (keysLength === 0) {
    return Number.POSITIVE_INFINITY;
  }
  if (prevIndex >= 0 && prevIndex < keysLength) {
    return prevIndex;
  }

  return Math.floor(keysLength / 2);
}

/**
 * Returns the collapsed top and bottom margins for an element, accounting for
 * neighboring siblings so drop zones don't overlap margin gutters.
 */
function getCollapsedMargins(elem: HTMLElement): {
  marginTop: number;
  marginBottom: number;
} {
  const getMargin = (
    element: Element | null,
    margin: 'marginTop' | 'marginBottom'
  ): number =>
    element ? Number.parseFloat(window.getComputedStyle(element)[margin]) : 0;

  const { marginTop, marginBottom } = window.getComputedStyle(elem);

  const prevElemSiblingMarginBottom = getMargin(
    elem.previousElementSibling,
    'marginBottom'
  );

  const nextElemSiblingMarginTop = getMargin(
    elem.nextElementSibling,
    'marginTop'
  );

  const collapsedTopMargin = Math.max(
    Number.parseFloat(marginTop),
    prevElemSiblingMarginBottom
  );

  const collapsedBottomMargin = Math.max(
    Number.parseFloat(marginBottom),
    nextElemSiblingMarginTop
  );

  return { marginBottom: collapsedBottomMargin, marginTop: collapsedTopMargin };
}

export { getCollapsedMargins };

/**
 * Finds the root-level block DOM element closest to `event` coordinates.
 * When `useEdgeAsDefault` is set, pointers above/below the whole note snap to
 * the first/last block respectively.
 */
export function getBlockElement({
  event,
  editor,
  noteContainer,
  useEdgeAsDefault = false,
}: {
  event: MouseEvent;
  editor: LexicalEditor;
  noteContainer: HTMLElement;
  useEdgeAsDefault?: boolean;
}): HTMLElement | null {
  const editorState = editor.getEditorState();

  let blockElem: HTMLElement | null = null;
  const noteContainerRect = noteContainer.getBoundingClientRect();

  editorState.read(() => {
    const rootKeys = $getRoot().getChildrenKeys();
    if (useEdgeAsDefault) {
      const [firstNode, lastNode] = [
        editor.getElementByKey(rootKeys[0]),
        editor.getElementByKey(rootKeys[rootKeys.length - 1]),
      ];

      const [firstNodeRect, lastNodeRect] = [
        firstNode?.getBoundingClientRect(),
        lastNode?.getBoundingClientRect(),
      ];

      if (firstNodeRect && lastNodeRect) {
        const firstNodeZoom = calculateZoomLevel(firstNode);
        const lastNodeZoom = calculateZoomLevel(lastNode);
        if (event.y / firstNodeZoom < firstNodeRect.top) {
          blockElem = firstNode;
        } else if (event.y / lastNodeZoom > lastNodeRect.bottom) {
          blockElem = lastNode;
        }

        if (blockElem) {
          return;
        }
      }
    }

    let index = getCurrentIndex(rootKeys.length);
    let direction = Indeterminate;

    while (index >= 0 && index < rootKeys.length) {
      const key = rootKeys[index];
      const elem = editor.getElementByKey(key);
      if (elem === null) break;

      const zoom = calculateZoomLevel(elem);
      const point = new Point(event.x / zoom, event.y / zoom);
      const domRect = Rect.fromDOM(elem);
      const { marginTop, marginBottom } = getCollapsedMargins(elem);
      const rect = domRect.generateNewRect({
        bottom: domRect.bottom + marginBottom,
        left: noteContainerRect.left,
        right: noteContainerRect.right,
        top: domRect.top - marginTop,
      });

      const {
        result,
        reason: { isOnTopSide, isOnBottomSide },
      } = rect.contains(point);

      if (result) {
        blockElem = elem;
        prevIndex = index;
        break;
      }

      if (direction === Indeterminate) {
        if (isOnTopSide) {
          direction = Upward;
        } else if (isOnBottomSide) {
          direction = Downward;
        } else {
          direction = Number.POSITIVE_INFINITY;
        }
      }

      index += direction;
    }
  });
  return blockElem as HTMLElement | null;
}
