import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import { motion, useMotionValue } from "framer-motion";
import {
	CLICK_COMMAND,
	COMMAND_PRIORITY_LOW,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_UP_COMMAND,
	KEY_BACKSPACE_COMMAND,
	KEY_ENTER_COMMAND,
	KEY_ESCAPE_COMMAND,
} from "lexical";
import { useEffect, useRef, useState } from "react";
import {
	arrowKeyDecoratorNodeCommand,
	backspaceKeyDecoratorNodeCommand,
	enterKeyDecoratorNodeCommand,
	escapeKeyDecoratorNodeCommand,
} from "../../utils/commands";
import { dragItem } from "../../utils/draggable";
import { cn } from "../../utils/string-formatting";

export function Image({
	src,
	width,
	height,
	nodeKey,
	goToNextElement,
}: {
	src: string;
	width: number | "inherit";
	height: number | "inherit";
	nodeKey: string;
	goToNextElement: () => void;
}) {
	const imgRef = useRef<HTMLImageElement>(null);
	const widthMotionValue = useMotionValue(300);
	const [editor] = useLexicalComposerContext();
	const [isResizing, setIsResizing] = useState(false);
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);

	function onClick(e: MouseEvent) {
		if (isResizing) {
			return true;
		}

		if (e.target === imgRef.current) {
			clearSelection();
			setSelected(true);
			return true;
		}

		return false;
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const unregister = mergeRegister(
			editor.registerCommand<MouseEvent>(
				KEY_ARROW_UP_COMMAND,
				(e) => arrowKeyDecoratorNodeCommand(e, nodeKey, true),
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<MouseEvent>(
				KEY_ARROW_DOWN_COMMAND,
				(e) => arrowKeyDecoratorNodeCommand(e, nodeKey, false),
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<MouseEvent>(
				CLICK_COMMAND,
				onClick,
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<KeyboardEvent>(
				KEY_ESCAPE_COMMAND,
				(e) => escapeKeyDecoratorNodeCommand(nodeKey),
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<KeyboardEvent>(
				KEY_ENTER_COMMAND,
				(e) => enterKeyDecoratorNodeCommand(e, nodeKey),
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<KeyboardEvent>(
				KEY_BACKSPACE_COMMAND,
				(e) => backspaceKeyDecoratorNodeCommand(e, nodeKey),
				COMMAND_PRIORITY_LOW,
			),
		);
		return () => {
			unregister();
		};
	}, [editor, nodeKey, isResizing]);

	return (
		<div className="w-full">
			<motion.div
				className={cn(
					"relative max-w-full min-w-40 cursor-auto",
					isSelected && "outline-blue-400 outline-4 outline",
				)}
				style={{ width: widthMotionValue }}
			>
				{isSelected && (
					<div
						className={
							"w-4 h-4 bg-blue-400 bottom-[-10px] right-[-9px] absolute cursor-nwse-resize"
						}
						onMouseDown={(mouseDownEvent) => {
							setIsResizing(true);
							dragItem(
								(dragEvent) => {
									const mouseDownBox = mouseDownEvent.target as HTMLDivElement;
									const mouseDownBoxRect = mouseDownBox.getBoundingClientRect();
									document.body.style.cursor = "nwse-resize";
									const widthDiff = mouseDownBoxRect.right - dragEvent.clientX;
									const heightDiff =
										mouseDownBoxRect.bottom - dragEvent.clientY;

									let isWidthSmaller = true;
									if (heightDiff < widthDiff) {
										isWidthSmaller = false;
									}
									let newWidth = 0;

									if (!imgRef.current) {
										return;
									}

									if (isWidthSmaller) {
										newWidth = imgRef.current.clientWidth - widthDiff;
									} else {
										const newHeight = imgRef.current.clientHeight - heightDiff;
										newWidth =
											newHeight *
											(imgRef.current.clientWidth /
												imgRef.current.clientHeight);
									}
									widthMotionValue.set(newWidth);
								},
								(e) => {
									e.stopPropagation();
									e.preventDefault();
									setTimeout(() => setIsResizing(false), 600);
								},
							);
						}}
					/>
				)}

				<img
					src={src}
					ref={imgRef}
					alt="bob"
					draggable={false}
					className="w-full h-auto"
					data-lexical-decorator="true"
				/>
			</motion.div>
		</div>
	);
}
