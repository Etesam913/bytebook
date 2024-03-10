import { motion, useMotionValue } from "framer-motion";
import {
	$createNodeSelection,
	$getNodeByKey,
	$setSelection,
	type LexicalEditor,
} from "lexical";
import {
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";
import { XResize } from "../../icons/arrows-expand-x";
import { XMark } from "../../icons/circle-xmark";
import { Fullscreen } from "../../icons/fullscreen";
import { Trash } from "../../icons/trash";
import { removeDecoratorNode } from "../../utils/commands";
import { dragItem } from "../../utils/draggable";
import { cn } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";
import { useTrapFocus } from "../dialog/hooks";
import { EXPAND_CONTENT_COMMAND } from "../editor/plugins/image";
import { getNearestSiblingNode } from "./utils";

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
}) {
	const widthMotionValue = useMotionValue<number>(500);

	const [isFullWidth, setIsFullWidth] = useState(true);
	const resizeContainerRef = useRef<HTMLDivElement>(null);

	const imageDimensions = useRef({ height: 0, width: 0 });

	useEffect(() => {
		if (isExpanded) {
			resizeContainerRef.current?.focus();
		}
	}, [isExpanded]);

	useTrapFocus(resizeContainerRef.current, isExpanded);
	return (
		<div ref={resizeContainerRef}>
			<motion.div
				onKeyDown={(e) => {
					if (e.key === "Escape" && isExpanded) {
						setIsExpanded(false);
						e.stopPropagation();
					}
					if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && isExpanded) {
						editor.update(() => {
							e.preventDefault();
							e.stopPropagation();
							const node = $getNodeByKey(nodeKey);
							if (node) {
								const nextNode = getNearestSiblingNode(
									node,
									e.key === "ArrowRight",
								);
								const nodeSelection = $createNodeSelection();
								if (!nextNode) return;
								nodeSelection.add(nextNode.getKey());
								$setSelection(nodeSelection);
								setIsExpanded(false);
								editor.dispatchCommand(
									EXPAND_CONTENT_COMMAND,
									nextNode.getKey(),
								);
							}
						});
					}
				}}
				tabIndex={isExpanded ? 0 : -1}
				onClick={(e) => {
					// We don't need clicks to go to the editor when in fullscreen mode
					if (isExpanded) e.stopPropagation();
				}}
				transition={{
					type: "spring",
					stiffness: 200,
					damping: 25,
				}}
				className={cn(
					"bg-black relative max-w-full min-w-40 cursor-auto outline-4 outline-transparent outline rounded-sm flex justify-center",
					isSelected && !isExpanded && "outline-blue-400",
					isResizing && "opacity-50",
					isExpanded &&
						"max-h-[95vw] fixed top-0 left-0 right-0 bottom-0 z-50 m-auto justify-start overflow-auto",
				)}
				style={{
					width: !isExpanded
						? isFullWidth
							? "100%"
							: widthMotionValue
						: "100%",
					transition: "border-color 0.2s ease-in-out, opacity 0.2s ease-in-out",
				}}
			>
				{isSelected && !isExpanded && (
					<>
						<motion.div
							className="absolute bg-zinc-50 dark:bg-zinc-700 p-2 rounded-md shadow-lg border-[1px] border-zinc-300 dark:border-zinc-600 flex items-center justify-center gap-3"
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: -30 }}
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
									setIsFullWidth(true);
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
							className={
								"w-4 h-4 bg-blue-400 bottom-[-10px] right-[-9px] absolute cursor-nwse-resize rounded-sm"
							}
							onMouseDown={(mouseDownEvent) => {
								setIsResizing(true);
								setIsFullWidth(false);
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
											newWidth = element.clientWidth - widthDiff;
										} else {
											const newHeight = element.clientHeight - heightDiff;
											newWidth =
												newHeight *
												(element.clientWidth / element.clientHeight);
										}
										widthMotionValue.set(newWidth);
									},

									() => {
										document.body.style.cursor = "";
										setTimeout(() => setIsResizing(false), 100);
									},
								);
							}}
						/>
					</>
				)}
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
						className="fixed z-50 right-3 top-4"
						type="submit"
					>
						<XMark width="1.5rem" height="1.5rem" />
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
