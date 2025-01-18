import { calculateZoomLevel } from "@lexical/utils";
import type { MotionValue } from "framer-motion";
import {
	$getNearestNodeFromDOMNode,
	$getRoot,
	type ElementNode,
	type LexicalEditor,
} from "lexical";
import type { Dispatch, SetStateAction } from "react";
import { constructGhostElementForNode } from "./ghost-elements";

export class Point {
	private readonly _x: number;
	private readonly _y: number;

	constructor(x: number, y: number) {
		this._x = x;
		this._y = y;
	}

	get x(): number {
		return this._x;
	}

	get y(): number {
		return this._y;
	}

	public equals({ x, y }: Point): boolean {
		return this.x === x && this.y === y;
	}

	public calcDeltaXTo({ x }: Point): number {
		return this.x - x;
	}

	public calcDeltaYTo({ y }: Point): number {
		return this.y - y;
	}

	public calcHorizontalDistanceTo(point: Point): number {
		return Math.abs(this.calcDeltaXTo(point));
	}

	public calcVerticalDistance(point: Point): number {
		return Math.abs(this.calcDeltaYTo(point));
	}

	public calcDistanceTo(point: Point): number {
		return Math.sqrt(
			this.calcDeltaXTo(point) ** 2 + this.calcDeltaYTo(point) ** 2,
		);
	}
}

export function isPoint(x: unknown): x is Point {
	return x instanceof Point;
}

type ContainsPointReturn = {
	result: boolean;
	reason: {
		isOnTopSide: boolean;
		isOnBottomSide: boolean;
		isOnLeftSide: boolean;
		isOnRightSide: boolean;
	};
};

/**
 * Used in getting info for the draggable element
 */
export class Rect {
	private readonly _left: number;
	private readonly _top: number;
	private readonly _right: number;
	private readonly _bottom: number;

	constructor(left: number, top: number, right: number, bottom: number) {
		const [physicTop, physicBottom] =
			top <= bottom ? [top, bottom] : [bottom, top];

		const [physicLeft, physicRight] =
			left <= right ? [left, right] : [right, left];

		this._top = physicTop;
		this._right = physicRight;
		this._left = physicLeft;
		this._bottom = physicBottom;
	}

	get top(): number {
		return this._top;
	}

	get right(): number {
		return this._right;
	}

	get bottom(): number {
		return this._bottom;
	}

	get left(): number {
		return this._left;
	}

	get width(): number {
		return Math.abs(this._left - this._right);
	}

	get height(): number {
		return Math.abs(this._bottom - this._top);
	}

	public equals({ top, left, bottom, right }: Rect): boolean {
		return (
			top === this._top &&
			bottom === this._bottom &&
			left === this._left &&
			right === this._right
		);
	}

	public contains({ x, y }: Point): ContainsPointReturn;
	public contains({ top, left, bottom, right }: Rect): boolean;
	public contains(target: Point | Rect): boolean | ContainsPointReturn {
		if (isPoint(target)) {
			const { x, y } = target;

			const isOnTopSide = y < this._top;
			const isOnBottomSide = y > this._bottom;
			const isOnLeftSide = x < this._left;
			const isOnRightSide = x > this._right;

			const result =
				!isOnTopSide && !isOnBottomSide && !isOnLeftSide && !isOnRightSide;

			return {
				reason: {
					isOnBottomSide,
					isOnLeftSide,
					isOnRightSide,
					isOnTopSide,
				},
				result,
			};
		}
		const { top, left, bottom, right } = target;

		return (
			top >= this._top &&
			top <= this._bottom &&
			bottom >= this._top &&
			bottom <= this._bottom &&
			left >= this._left &&
			left <= this._right &&
			right >= this._left &&
			right <= this._right
		);
	}

	public intersectsWith(rect: Rect): boolean {
		const { left: x1, top: y1, width: w1, height: h1 } = rect;
		const { left: x2, top: y2, width: w2, height: h2 } = this;
		const maxX = x1 + w1 >= x2 + w2 ? x1 + w1 : x2 + w2;
		const maxY = y1 + h1 >= y2 + h2 ? y1 + h1 : y2 + h2;
		const minX = x1 <= x2 ? x1 : x2;
		const minY = y1 <= y2 ? y1 : y2;
		return maxX - minX <= w1 + w2 && maxY - minY <= h1 + h2;
	}

	public generateNewRect({
		left = this.left,
		top = this.top,
		right = this.right,
		bottom = this.bottom,
	}): Rect {
		return new Rect(left, top, right, bottom);
	}

	static fromLTRB(
		left: number,
		top: number,
		right: number,
		bottom: number,
	): Rect {
		return new Rect(left, top, right, bottom);
	}

	static fromLWTH(
		left: number,
		width: number,
		top: number,
		height: number,
	): Rect {
		return new Rect(left, top, left + width, top + height);
	}

	static fromPoints(startPoint: Point, endPoint: Point): Rect {
		const { y: top, x: left } = startPoint;
		const { y: bottom, x: right } = endPoint;
		return Rect.fromLTRB(left, top, right, bottom);
	}

	static fromDOM(dom: HTMLElement): Rect {
		const { top, width, left, height } = dom.getBoundingClientRect();
		return Rect.fromLWTH(left, width, top, height);
	}
}

let prevIndex = Number.POSITIVE_INFINITY;

const Downward = 1;
const Upward = -1;
const Indeterminate = 0;

/**
 * Returns the index of the current key in the list of keys.
 * If the previous index is not valid, it returns the middle index.
 * @param {number} keysLength - The length of the list of keys.
 * @returns {number} The index of the current key.
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

export const DRAG_DATA_FORMAT = "application/x-lexical-drag-block";

/**
 * Calculates the collapsed top and bottom margins for a given HTML element.
 *
 * @param {HTMLElement} elem - The HTML element for which to calculate the collapsed margins.
 * @returns {Object} An object containing the collapsed top and bottom margins.
 * @property {number} marginTop - The collapsed top margin.
 * @property {number} marginBottom - The collapsed bottom margin.
 */
export function getCollapsedMargins(elem: HTMLElement): {
	marginTop: number;
	marginBottom: number;
} {
	/**
	 * Helper function to get the specified margin (top or bottom) of an element.
	 * If the element is null, it returns 0.
	 *
	 * @param {Element | null} element - The element from which to get the margin.
	 * @param {'marginTop' | 'marginBottom'} margin - The type of margin to get.
	 * @returns {number} The margin value in pixels.
	 */
	const getMargin = (
		element: Element | null,
		margin: "marginTop" | "marginBottom",
	): number =>
		element ? Number.parseFloat(window.getComputedStyle(element)[margin]) : 0;

	// Get the top and bottom margin of the current element
	const { marginTop, marginBottom } = window.getComputedStyle(elem);

	// Get the bottom margin of the previous sibling element
	const prevElemSiblingMarginBottom = getMargin(
		elem.previousElementSibling,
		"marginBottom",
	);

	// Get the top margin of the next sibling element
	const nextElemSiblingMarginTop = getMargin(
		elem.nextElementSibling,
		"marginTop",
	);

	// Calculate the collapsed top margin by taking the maximum of the current top margin
	// and the bottom margin of the previous sibling
	const collapsedTopMargin = Math.max(
		Number.parseFloat(marginTop),
		prevElemSiblingMarginBottom,
	);

	// Calculate the collapsed bottom margin by taking the maximum of the current bottom margin
	// and the top margin of the next sibling
	const collapsedBottomMargin = Math.max(
		Number.parseFloat(marginBottom),
		nextElemSiblingMarginTop,
	);

	// Return the collapsed margins
	return { marginBottom: collapsedBottomMargin, marginTop: collapsedTopMargin };
}

/**
 * Gets the element that is the closest to the given coordinates.
 * Used in node dragging
 */
export function getBlockElement(
	event: MouseEvent,
	editor: LexicalEditor,
	noteContainer: HTMLElement,
	useEdgeAsDefault = false,
) {
	const editorState = editor.getEditorState();
	// The children of the root

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

			// If point is inside the block element, then you found the block element
			if (result) {
				blockElem = elem;
				prevIndex = index;
				break;
			}

			// Find which direction to go based off of the point
			if (direction === Indeterminate) {
				if (isOnTopSide) {
					direction = Upward;
				} else if (isOnBottomSide) {
					direction = Downward;
				} else {
					// stop search block element
					direction = Number.POSITIVE_INFINITY;
				}
			}

			index += direction;
		}
	});
	return blockElem;
}

/**
 * Sets the motion value for the target line based on the target block element and the mouse position.
 */
export function setTargetLine(
	targetBlockElem: HTMLElement,
	mouseY: number,
	noteContainer: HTMLElement,
	yMotionValue: MotionValue<number>,
) {
	const { top: targetBlockElemTop, height: targetBlockElemHeight } =
		targetBlockElem.getBoundingClientRect();
	const { top: noteContainerTop } = noteContainer.getBoundingClientRect();
	const { marginTop, marginBottom } = getCollapsedMargins(targetBlockElem);
	let lineTop = targetBlockElemTop;
	if (mouseY >= targetBlockElemTop) {
		lineTop += targetBlockElemHeight + marginBottom / 2;
	} else {
		lineTop -= marginTop / 2;
	}
	const top = lineTop - noteContainerTop - 4 + noteContainer.scrollTop;

	yMotionValue.set(top);
}

/** Updates position and opacity values for handle based on `targetElem` */
export function setHandlePosition(
	draggableBlockElement: HTMLElement | null,
	handle: HTMLElement,
	noteContainer: HTMLElement,
	setIsHandleShowing: Dispatch<SetStateAction<boolean>>,
	yMotionValue: MotionValue<number>,
) {
	if (!draggableBlockElement) {
		setIsHandleShowing(false);
		return;
	}

	const draggableBlockRect = draggableBlockElement.getBoundingClientRect();
	const draggableBlockStyle = window.getComputedStyle(draggableBlockElement);
	const handleRect = handle.getBoundingClientRect();
	const noteContainerRect = noteContainer.getBoundingClientRect();

	const elementLineHeight = Number.parseInt(draggableBlockStyle.lineHeight, 10);

	const cleanedElementLineHeight = Number.isNaN(elementLineHeight)
		? 0
		: elementLineHeight;

	const top =
		draggableBlockRect.top +
		(cleanedElementLineHeight - handleRect.height) / 2 -
		noteContainerRect.top +
		noteContainer.scrollTop;
	yMotionValue.set(top);

	setIsHandleShowing(true);
}

/**
 * Creates the ghost element of the block being dragged and sets the data transfer properties
 */
export function handleDragStart(
	e: DragEvent,
	editor: LexicalEditor,
	setIsDragging: Dispatch<SetStateAction<boolean>>,
	draggableBlockElement: HTMLElement | null,
	setDraggedElement: Dispatch<SetStateAction<HTMLElement | null>>,
	noteContainer: HTMLElement | null,
) {
	if (!e.dataTransfer || !draggableBlockElement) {
		return;
	}

	let nodeKey = "";
	const ghostElement = draggableBlockElement.cloneNode(true) as HTMLElement;
	ghostElement.id = "block-element";
	ghostElement.classList.add("dragging");

	editor.read(() => {
		const node = $getNearestNodeFromDOMNode(draggableBlockElement);
		if (!node) return;
		if ((node as ElementNode).getChildren) {
			const elementNode = node as ElementNode;
			elementNode.getChildren().forEach((child) => {
				constructGhostElementForNode(child, ghostElement);
			});
		}
		nodeKey = node.getKey();
	});

	if (noteContainer) {
		ghostElement.style.fontFamily = noteContainer.style.fontFamily;
		ghostElement.style.maxWidth = `${noteContainer.clientWidth}px`;
	}

	setDraggedElement(ghostElement);

	e.dataTransfer.setDragImage(ghostElement, 0, 0);
	document.body.appendChild(ghostElement);

	setIsDragging(true);
	e.dataTransfer.setData(DRAG_DATA_FORMAT, nodeKey);
}

const DRAGGABLE_BLOCK_MENU_CLASSNAME = "draggable-block-menu";

export function isOnHandle(element: HTMLElement): boolean {
	return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}
