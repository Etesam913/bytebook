import { type MotionValue, motion, AnimatePresence } from "framer-motion";
import {
	useEffect,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useState,
} from "react";
import { dragItem } from "../../utils/draggable";
import { cn } from "../../utils/string-formatting";
import { Trash } from "../../icons/trash";
import { getDefaultButtonVariants } from "../../variants";
import {
	backspaceKeyDecoratorNodeCommand,
	removeDecoratorNode,
} from "../../utils/commands";
import type { LexicalEditor } from "lexical";
import { Fullscreen } from "../../icons/fullscreen";
import { XResize } from "../../icons/arrows-expand-x";

export function ResizeContainer({
	isSelected,
	isResizing,
	setIsResizing,
	widthMotionValue,
	element,
	children,
	nodeKey,
	editor,
}: {
	isSelected: boolean;
	isResizing: boolean;
	setIsResizing: Dispatch<SetStateAction<boolean>>;
	widthMotionValue: MotionValue<number>;
	element: HTMLElement | null;
	children: ReactNode;
	nodeKey: string;
	editor: LexicalEditor;
}) {
	const [isFullWidth, setIsFullWidth] = useState(false);
	const [isExpanded, setIsExpanded] = useState();

	useEffect(() => {
		console.log(isFullWidth);
		if (isFullWidth && element) {
			widthMotionValue.set(element.clientWidth);
		}
	}, [isFullWidth, element, widthMotionValue]);

	return (
		<motion.div
			className={cn(
				"relative max-w-full min-w-40 cursor-auto border-4 border-transparent rounded-sm flex justify-center",
				isSelected && "border-blue-400",
				isResizing && "opacity-50",
			)}
			style={{
				width: isFullWidth ? "100%" : widthMotionValue,
				transition: "border-color 0.2s ease-in-out, opacity 0.2s ease-in-out",
			}}
		>
			<AnimatePresence>
				{isSelected && (
					<>
						<motion.div
							className="absolute bg-zinc-50 dark:bg-zinc-700 p-2 rounded-md shadow-lg border-[1px] border-zinc-300 dark:border-zinc-600 flex items-center justify-center gap-3"
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: -30 }}
							exit={{
								opacity: 0,
								y: -20,
								transition: { opacity: { duration: 0.3 } },
							}}
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
			</AnimatePresence>
			{children}
		</motion.div>
	);
}
