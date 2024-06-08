import { calculateZoomLevel } from "@lexical/utils";
import type { MotionValue } from "framer-motion";
import { $getRoot, type LexicalEditor } from "lexical";
import type { Dispatch, SetStateAction } from "react";

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

export function getBlockElement(
	event: MouseEvent,
	editor: LexicalEditor,
	noteContainer: HTMLElement,
	useEdgeAsDefault = false,
) {
	const rootKeys = editor
		.getEditorState()
		.read(() => $getRoot().getChildrenKeys());
	let blockElem: HTMLElement | null = null;
	const noteContainerRect = noteContainer.getBoundingClientRect();

	editor.getEditorState().read(() => {
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
					// stop search block element
					direction = Number.POSITIVE_INFINITY;
				}
			}

			index += direction;
		}
	});
	return blockElem;
}

export function setHandlePosition(
	targetElem: HTMLElement | null,
	floatingElem: HTMLElement,
	anchorElem: HTMLElement,
	setIsHandleShowing: Dispatch<SetStateAction<boolean>>,
	yMotionValue: MotionValue<number>,
) {
	if (!targetElem) {
		// floatingElem.style.opacity = "0";
		setIsHandleShowing(false);
		// floatingElem.style.transform = "translate(-10000px, -10000px)";
		return;
	}

	const targetRect = targetElem.getBoundingClientRect();
	const targetStyle = window.getComputedStyle(targetElem);
	const floatingElemRect = floatingElem.getBoundingClientRect();
	const anchorElementRect = anchorElem.getBoundingClientRect();

	const top =
		targetRect.top +
		(Number.parseInt(targetStyle.lineHeight, 10) - floatingElemRect.height) /
			2 -
		anchorElementRect.top;

	yMotionValue.set(top);

	setIsHandleShowing(true);
}
