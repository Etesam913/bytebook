import { AnimatePresence, motion, useMotionValue } from "framer-motion";
import type { LexicalEditor } from "lexical";
import {
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";
import { XResize } from "../../icons/arrows-expand-x";
import { CircleArrowLeft } from "../../icons/circle-arrow-left";
import { CircleArrowRight } from "../../icons/circle-arrow-right";
import { XMark } from "../../icons/circle-xmark";
import { Fullscreen } from "../../icons/fullscreen";
import { Trash } from "../../icons/trash";
import { removeDecoratorNode } from "../../utils/commands";
import { dragItem } from "../../utils/draggable";
import { cn } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";
import { useTrapFocus } from "../dialog/hooks";
import { ResizeWidth } from "../editor/nodes/image";
import { expandNearestSiblingNode } from "./utils";

export function ResizeContainer({
	isSelected,
	isResizing,
	isExpanded,
	setIsExpanded,
	setIsResizing,
	element,
	children,
	nodeKey,
	editor,
	defaultWidth,
	writeWidthToNode,
}: {
	isSelected: boolean;
	isResizing: boolean;
	isExpanded: boolean;
	setIsExpanded: Dispatch<SetStateAction<boolean>>;
	setIsResizing: Dispatch<SetStateAction<boolean>>;
	element: HTMLElement | null;
	children: ReactNode;
	nodeKey: string;
	editor: LexicalEditor;
	defaultWidth: ResizeWidth;
	writeWidthToNode: (width: ResizeWidth) => void;
}) {
	const widthMotionValue = useMotionValue<number | "100%">(defaultWidth);

	const resizeContainerRef = useRef<HTMLDivElement>(null);

	const imageDimensions = useRef({ height: 0, width: 0 });

	useEffect(() => {
		if (isExpanded) {
			resizeContainerRef.current?.focus();
		}
	}, [isExpanded]);

	useTrapFocus(resizeContainerRef, isExpanded);

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
					"relative max-w-full min-w-40 cursor-auto outline outline-transparent rounded-sm flex justify-center",
					isSelected && !isExpanded && "outline-blue-400",
					isResizing && "opacity-50",
					isExpanded &&
						"max-h-screen fixed top-0 left-0 right-0 bottom-0 z-50 m-auto justify-start overflow-auto",
				)}
				style={{
					width: !isExpanded ? widthMotionValue : "100%",
					transition: "outline 0.2s ease-in-out, opacity 0.2s ease-in-out",
				}}
			>
				<AnimatePresence>
					{isSelected && !isExpanded && (
						<>
							<motion.div
								className="absolute bg-zinc-50 dark:bg-zinc-700 p-2 rounded-md shadow-lg border-[1px] border-zinc-300 dark:border-zinc-600 flex items-center justify-center gap-3"
								initial={{ opacity: 0, y: -20 }}
								animate={{ opacity: 1, y: -30 }}
								exit={{ opacity: 0, y: -20 }}
							>
								<motion.button
									{...getDefaultButtonVariants(false, 1.115, 0.95, 1.115)}
									type="button"
									onClick={() =>
										editor.update(() => {
											removeDecoratorNode(nodeKey);
										})
									}
								>
									<Trash />
								</motion.button>
								<motion.button
									{...getDefaultButtonVariants(false, 1.115, 0.95, 1.115)}
									type="button"
									onClick={() => {
										widthMotionValue.set("100%");
										writeWidthToNode("100%");
									}}
								>
									<XResize />
								</motion.button>
								<motion.button
									{...getDefaultButtonVariants(false, 1.115, 0.95, 1.115)}
									type="button"
									onClick={() => {
										setIsExpanded(true);
										resizeContainerRef.current?.focus();
										imageDimensions.current = {
											height: element?.clientHeight ?? 0,
											width: element?.clientWidth ?? 0,
										};
									}}
								>
									<Fullscreen />
								</motion.button>
							</motion.div>

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
											document.body.style.cursor = "nwse-resize";
											const widthDiff =
												mouseDownBoxRect.right - dragEvent.clientX;
											const heightDiff =
												mouseDownBoxRect.bottom - dragEvent.clientY;

											let isWidthSmaller = true;
											if (heightDiff < widthDiff) {
												isWidthSmaller = false;
											}
											let newWidth = 0;
											if (!element) {
												return;
											}

											if (isWidthSmaller) {
												newWidth = Math.round(element.clientWidth - widthDiff);
											} else {
												const newHeight = element.clientHeight - heightDiff;
												newWidth = Math.round(
													newHeight *
														(element.clientWidth / element.clientHeight),
												);
											}
											widthMotionValue.set(newWidth);
										},

										() => {
											document.body.style.cursor = "";
											setTimeout(() => {
												console.log(widthMotionValue.get());
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

					<motion.button
						{...getDefaultButtonVariants()}
						onClick={() =>
							expandNearestSiblingNode(editor, nodeKey, setIsExpanded, false)
						}
						className="fixed z-50 bottom-11 left-[40%] bg-[rgba(0,0,0,0.55)] text-white p-1 rounded-full"
						type="submit"
					>
						<CircleArrowLeft width="1.75rem" height="1.75rem" />
					</motion.button>

					<motion.button
						{...getDefaultButtonVariants()}
						onClick={() =>
							expandNearestSiblingNode(editor, nodeKey, setIsExpanded, true)
						}
						className="fixed z-50 bottom-11 right-[40%] bg-[rgba(0,0,0,0.55)] text-white p-1 rounded-full"
						type="submit"
					>
						<CircleArrowRight width="1.75rem" height="1.75rem" />
					</motion.button>

					<div
						style={{
							width: imageDimensions.current.width,
							height: imageDimensions.current.height,
						}}
					/>
				</>
			)}
		</div>
	);
}
