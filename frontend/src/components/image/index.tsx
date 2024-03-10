import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
	CLICK_COMMAND,
	COMMAND_PRIORITY_LOW,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_UP_COMMAND,
	KEY_BACKSPACE_COMMAND,
	KEY_ENTER_COMMAND,
	KEY_ESCAPE_COMMAND,
} from "lexical";
import { useEffect, useRef } from "react";
import {
	arrowKeyDecoratorNodeCommand,
	backspaceKeyDecoratorNodeCommand,
	enterKeyDecoratorNodeCommand,
	escapeKeyDecoratorNodeCommand,
	onClickDecoratorNodeCommand,
} from "../../utils/commands";
import { useResizeState } from "../../utils/hooks";
import { ResizeContainer } from "../resize-container";

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
	const [editor] = useLexicalComposerContext();

	const {
		widthMotionValue,
		isResizing,
		setIsResizing,
		isSelected,
		setSelected,
		clearSelection,
	} = useResizeState(nodeKey);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		return mergeRegister(
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
				(e) =>
					onClickDecoratorNodeCommand(
						e,
						imgRef.current,
						isResizing,
						setSelected,
						clearSelection,
					),
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
	}, [editor, nodeKey, isResizing]);

	return (
		<div className="w-full">
			<ResizeContainer
				isSelected={isSelected}
				isResizing={isResizing}
				setIsResizing={setIsResizing}
				widthMotionValue={widthMotionValue}
				element={imgRef.current}
				nodeKey={nodeKey}
				editor={editor}
			>
				<img
					src={src}
					ref={imgRef}
					alt={"bob"}
					draggable={false}
					className="w-full h-auto"
					data-lexical-decorator="true"
				/>
			</ResizeContainer>
		</div>
	);
}
