import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
	CLICK_COMMAND,
	COMMAND_PRIORITY_HIGH,
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
import { EXPAND_CONTENT_COMMAND } from "../editor/plugins/image";
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
		isResizing,
		setIsResizing,
		isSelected,
		setSelected,
		clearSelection,
		isExpanded,
		setIsExpanded,
	} = useResizeState(nodeKey);

	useEffect(() => {
		if (isSelected) {
			imgRef.current?.scrollIntoView({ block: "start" });
		}
	}, [isSelected, nodeKey, imgRef]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<MouseEvent>(
				KEY_ARROW_UP_COMMAND,
				(e) => {
					if (!isExpanded) {
						return arrowKeyDecoratorNodeCommand(e, nodeKey, true);
					}
					e.preventDefault();
					e.stopPropagation();
					return true;
				},
				isExpanded ? COMMAND_PRIORITY_HIGH : COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<MouseEvent>(
				KEY_ARROW_DOWN_COMMAND,
				(e) => {
					if (!isExpanded) {
						return arrowKeyDecoratorNodeCommand(e, nodeKey, false);
					}
					e.preventDefault();
					e.stopPropagation();
					return true;
				},
				isExpanded ? COMMAND_PRIORITY_HIGH : COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<MouseEvent>(
				CLICK_COMMAND,
				(e) => {
					if (!isExpanded) {
						return onClickDecoratorNodeCommand(
							e,
							imgRef.current,
							isResizing,
							setSelected,
							clearSelection,
						);
					}
					e.preventDefault();
					e.stopPropagation();
					return true;
				},
				isExpanded ? COMMAND_PRIORITY_HIGH : COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<KeyboardEvent>(
				KEY_ESCAPE_COMMAND,
				(e) => {
					if (!isExpanded) {
						return escapeKeyDecoratorNodeCommand(nodeKey);
					}
					e.preventDefault();
					e.stopPropagation();
					return true;
				},
				isExpanded ? COMMAND_PRIORITY_HIGH : COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<KeyboardEvent>(
				KEY_ENTER_COMMAND,
				(e) => {
					if (!isExpanded) {
						return enterKeyDecoratorNodeCommand(e, nodeKey);
					}
					e.preventDefault();
					e.stopPropagation();
					return true;
				},
				isExpanded ? COMMAND_PRIORITY_HIGH : COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<KeyboardEvent>(
				KEY_BACKSPACE_COMMAND,
				(e) => {
					if (!isExpanded) {
						return backspaceKeyDecoratorNodeCommand(e, nodeKey);
					}
					e.preventDefault();
					e.stopPropagation();
					return true;
				},
				isExpanded ? COMMAND_PRIORITY_HIGH : COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<string>(
				EXPAND_CONTENT_COMMAND,
				(keyToExpand) => {
					if (keyToExpand === nodeKey) {
						setIsExpanded(true);
						imgRef.current?.scrollIntoView({
							block: "start",
						});
						return true;
					}

					return false;
				},
				COMMAND_PRIORITY_LOW,
			),
		);
	}, [editor, nodeKey, isResizing, isExpanded]);

	return (
		<div className="w-full">
			<ResizeContainer
				isSelected={isSelected}
				isResizing={isResizing}
				setIsResizing={setIsResizing}
				element={imgRef.current}
				nodeKey={nodeKey}
				editor={editor}
				isExpanded={isExpanded}
				setIsExpanded={setIsExpanded}
			>
				<img
					src={src}
					ref={imgRef}
					alt={"bob"}
					draggable={false}
					className="w-full h-auto my-auto scroll-m-10"
					data-lexical-decorator="true"
				/>
			</ResizeContainer>
		</div>
	);
}
