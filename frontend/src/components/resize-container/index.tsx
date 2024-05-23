import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	AnimatePresence,
	motion,
	useMotionValue,
	useSpring,
} from "framer-motion";
import { type ReactNode, useEffect, useRef } from "react";
import { getDefaultButtonVariants } from "../../animations";

import { CircleArrowLeft } from "../../icons/circle-arrow-left";
import { CircleArrowRight } from "../../icons/circle-arrow-right";
import { XMark } from "../../icons/circle-xmark";
import type { ResizeState, ResizeWidth } from "../../types";

import { dragItem } from "../../utils/draggable";
import { cn } from "../../utils/string-formatting";
import { useTrapFocus } from "../dialog/hooks";
import { ResizeControls } from "./resize-controls";
import { expandNearestSiblingNode, useMouseActivity } from "./utils";

export function ResizeContainer({
	resizeState,
	element,
	children,
	nodeKey,
	defaultWidth,
	writeWidthToNode,
	elementType,
	shouldHeightMatchWidth,
}: {
	resizeState: ResizeState;
	element: HTMLElement | null;
	children: ReactNode;
	nodeKey: string;
	defaultWidth: ResizeWidth;
	writeWidthToNode: (width: ResizeWidth) => void;
	elementType: "image" | "video" | "excalidraw";
	shouldHeightMatchWidth?: boolean;
}) {
	const widthMotionValue = useMotionValue<number | "100%">(defaultWidth);
	const s = useSpring(widthMotionValue, { damping: 18, stiffness: 105 });
	const resizeWidthMotionValue = useMotionValue<number | "100%">(
		widthMotionValue.get(),
	);
	const resizeHeightMotionValue = useMotionValue<number | "100%">("100%");

	const { isSelected, isExpanded, setIsExpanded, setIsResizing } = resizeState;

	const resizeDimensions = useRef({ height: 0, width: 0 });
	const resizeContainerRef = useRef<HTMLDivElement>(null);

	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (isExpanded) {
			resizeContainerRef.current?.focus();
		}
	}, [isExpanded]);

	useTrapFocus(resizeContainerRef, isExpanded);

	const isLeftAndRightArrowKeysShowing =
		elementType !== "excalidraw" && useMouseActivity(1500, isExpanded);

	return (
		<div ref={resizeContainerRef}>
			<motion.div
				onKeyDown={(e) => {
					if (e.key === "Escape" && isExpanded) {
						setIsExpanded(false);
						e.stopPropagation();
					}
					if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && isExpanded) {
						e.preventDefault();
						e.stopPropagation();
						expandNearestSiblingNode(
							editor,
							nodeKey,
							setIsExpanded,
							e.key === "ArrowRight",
						);
					}
				}}
				tabIndex={isExpanded ? 0 : -1}
				onClick={(e) => {
					// We don't need clicks to go to the editor when in fullscreen mode
					if (isExpanded) e.stopPropagation();
				}}
				className={cn(
					"relative max-w-full cursor-auto rounded-sm flex outline-none",
					isExpanded &&
						"max-h-screen fixed top-0 left-0 right-0 bottom-0 z-20 m-auto justify-start overflow-auto",
					isExpanded && elementType === "excalidraw" && "!h-screen",
				)}
				style={{
					width: !isExpanded ? s : "100%",
					height: shouldHeightMatchWidth ? s : "auto",
					transition: "outline 0.2s ease-in-out, opacity 0.2s ease-in-out",
				}}
			>
				<AnimatePresence>
					{isSelected && !isExpanded && (
						<>
							<motion.div
								className="absolute z-10 h-full w-full border-[4px] border-blue-400 rounded-sm"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								style={{
									width: resizeWidthMotionValue,
									height: resizeHeightMotionValue,
								}}
							/>
							<ResizeControls
								elementType={elementType}
								nodeKey={nodeKey}
								motionValues={{
									widthMotionValue,
									resizeWidthMotionValue,
									resizeHeightMotionValue,
								}}
								writeWidthToNode={writeWidthToNode}
								resizeState={resizeState}
								resizeContainerRef={resizeContainerRef}
								resizeDimensionsRef={resizeDimensions}
								element={element}
							/>
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0, transition: { duration: 0.25 } }}
								className={
									"w-4 h-4 bg-blue-400 bottom-[-10px] right-[-9px] absolute cursor-nwse-resize rounded-sm"
								}
								onMouseDown={(mouseDownEvent) => {
									setIsResizing(true);
									dragItem(
										(dragEvent) => {
											const mouseDownBox =
												mouseDownEvent.target as HTMLDivElement;
											const mouseDownBoxRect =
												mouseDownBox.getBoundingClientRect();
											const widthDiff =
												mouseDownBoxRect.right - dragEvent.clientX;
											const heightDiff =
												mouseDownBoxRect.bottom - dragEvent.clientY;

											// Early exit if element is not defined
											if (!element) {
												return;
											}

											document.body.style.cursor = "nwse-resize";

											const isWidthSmaller = widthDiff < heightDiff;
											let newWidth = 0;
											let newHeight = 0;
											if (isWidthSmaller) {
												// Calculate new width based on width difference
												newWidth = Math.max(
													160,
													Math.round(element.clientWidth - widthDiff),
												);
												newHeight = Math.round(
													newWidth *
														(element.clientHeight / element.clientWidth),
												);
											} else {
												// Calculate new height and adjust width to maintain aspect ratio
												newHeight = element.clientHeight - heightDiff;
												newWidth = Math.max(
													160,
													Math.round(
														newHeight *
															(element.clientWidth / element.clientHeight),
													),
												);
												// Recalculate newHeight as the width could have changed to 160
												newHeight = Math.round(
													newWidth *
														(element.clientHeight / element.clientWidth),
												);
											}

											// Update the width through the motion value
											resizeWidthMotionValue.set(newWidth);
											resizeHeightMotionValue.set(newHeight);
										},

										() => {
											document.body.style.cursor = "";
											widthMotionValue.set(resizeWidthMotionValue.get());
											setTimeout(() => {
												writeWidthToNode(widthMotionValue.get());
											}, 100);
											setIsResizing(false);
										},
									);
								}}
							/>
						</>
					)}
				</AnimatePresence>
				{children}
			</motion.div>
			{isExpanded && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={() => setIsExpanded(false)}
						className="fixed z-10 w-screen h-screen bg-[rgba(0,0,0,0.6)] left-0 top-0"
					/>
					<motion.button
						{...getDefaultButtonVariants()}
						onClick={() => setIsExpanded(false)}
						className="fixed z-50 right-5 top-4 bg-[rgba(0,0,0,0.55)] text-white p-1 rounded-full"
						type="submit"
					>
						<XMark width="1.5rem" height="1.5rem" />
					</motion.button>

					<AnimatePresence initial={false}>
						{isLeftAndRightArrowKeysShowing && (
							<>
								<motion.button
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									{...getDefaultButtonVariants()}
									onClick={() =>
										expandNearestSiblingNode(
											editor,
											nodeKey,
											setIsExpanded,
											false,
										)
									}
									className="fixed z-50 bottom-11 left-[40%] bg-[rgba(0,0,0,0.55)] text-white p-1 rounded-full"
									type="submit"
								>
									<CircleArrowLeft width="1.75rem" height="1.75rem" />
								</motion.button>

								<motion.button
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									{...getDefaultButtonVariants()}
									onClick={() =>
										expandNearestSiblingNode(
											editor,
											nodeKey,
											setIsExpanded,
											true,
										)
									}
									className="fixed z-50 bottom-11 right-[40%] bg-[rgba(0,0,0,0.55)] text-white p-1 rounded-full"
									type="submit"
								>
									<CircleArrowRight width="1.75rem" height="1.75rem" />
								</motion.button>
							</>
						)}
					</AnimatePresence>

					<div
						style={{
							width: resizeDimensions.current.width,
							height: resizeDimensions.current.height,
						}}
					/>
				</>
			)}
		</div>
	);
}
