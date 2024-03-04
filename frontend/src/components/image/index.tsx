import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import { motion, useMotionValue } from "framer-motion";
import { CLICK_COMMAND, COMMAND_PRIORITY_LOW } from "lexical";
import { useEffect, useRef } from "react";
import { dragItem } from "../../utils/draggable";
import { cn } from "../../utils/string-formatting";

export function Image({
	src,
	width,
	height,
	nodeKey,
}: {
	src: string;
	width: number | "inherit";
	height: number | "inherit";
	nodeKey: string;
}) {
	const imgRef = useRef<HTMLImageElement>(null);
	const widthMotionValue = useMotionValue(300);
	const [editor] = useLexicalComposerContext();
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);

	function onClick(e: MouseEvent) {
		if (e.target === imgRef.current) {
			if (isSelected) {
				setSelected(false);
			} else {
				clearSelection();
				setSelected(true);
			}
			return true;
		}

		return false;
	}

	useEffect(() => {
		const unregister = mergeRegister(
			editor.registerUpdateListener(() => {
				// if (isMounted) {
				// 	setSelection(editorState.read(() => $getSelection()));
				// }
			}),
			editor.registerCommand<MouseEvent>(
				CLICK_COMMAND,
				onClick,
				COMMAND_PRIORITY_LOW,
			),
			// editor.registerCommand(
			//   KEY_DELETE_COMMAND,
			//   onDelete,
			//   COMMAND_PRIORITY_LOW,
			// ),
			// editor.registerCommand(
			//   KEY_BACKSPACE_COMMAND,
			//   onDelete,
			//   COMMAND_PRIORITY_LOW,
			// ),
			// editor.registerCommand(
			//   KEY_ESCAPE_COMMAND,
			//   onEscape,
			//   COMMAND_PRIORITY_LOW,
			// ),
		);

		return () => {
			unregister();
		};
	}, [editor]);

	return (
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
						dragItem(
							(dragEvent) => {
								const mouseDownBox = mouseDownEvent.target as HTMLDivElement;
								const mouseDownBoxRect = mouseDownBox.getBoundingClientRect();
								document.body.style.cursor = "nwse-resize";
								const widthDiff = mouseDownBoxRect.right - dragEvent.clientX;
								const heightDiff = mouseDownBoxRect.bottom - dragEvent.clientY;

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
										(imgRef.current.clientWidth / imgRef.current.clientHeight);
								}
								widthMotionValue.set(newWidth);
							},
							(e) => {
								e.stopPropagation();
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
				// onClick={(e) => e.stopPropagation()}
			/>
		</motion.div>
	);
}
