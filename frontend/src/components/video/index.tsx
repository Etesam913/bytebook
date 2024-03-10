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

export function Video({
	src,
	width,
	height,
	title,
	nodeKey,
}: {
	src: string;
	width: number | "inherit";
	height: number | "inherit";
	title: string;
	nodeKey: string;
}) {
	const [editor] = useLexicalComposerContext();
	const videoRef = useRef<HTMLVideoElement>(null);

	const {
		isResizing,
		setIsResizing,
		isSelected,
		setSelected,
		clearSelection,
		isExpanded,
		setIsExpanded,
	} = useResizeState(nodeKey);

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
							videoRef.current,
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
						videoRef.current?.scrollIntoView({
							behavior: "instant",
							block: "center",
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
				element={videoRef.current}
				nodeKey={nodeKey}
				editor={editor}
				isExpanded={isExpanded}
				setIsExpanded={setIsExpanded}
			>
				{/* biome-ignore lint/a11y/useMediaCaption: <explanation> */}
				<video
					ref={videoRef}
					className="w-full h-auto bg-black"
					title={title}
					src={`${src}#t=0.1`}
					controls
					preload="metadata"
				/>
			</ResizeContainer>
		</div>
	);
}
