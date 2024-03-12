import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
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
	type LexicalEditor,
} from "lexical";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";
import { EXPAND_CONTENT_COMMAND } from "../components/editor/plugins/image";
import {
	arrowKeyDecoratorNodeCommand,
	backspaceKeyDecoratorNodeCommand,
	enterKeyDecoratorNodeCommand,
	escapeKeyDecoratorNodeCommand,
	onClickDecoratorNodeCommand,
} from "./commands";

export const useDelayedLoader = (
	value = false,
	delay = 500,
): [boolean, Dispatch<SetStateAction<boolean>>] => {
	const [loading, setLoading] = useState<boolean>(value);
	const [delayedLoading, setDelayedLoading] = useState<boolean>(value);
	const loadTimeoutId = useRef<null | number>(null);

	const clearLoadTimeout = () => {
		if (loadTimeoutId.current != null) {
			window.clearTimeout(loadTimeoutId.current);
			loadTimeoutId.current = null;
		}
	};
	useEffect(() => {
		clearLoadTimeout();
		if (loading === false) setDelayedLoading(false);
		else {
			loadTimeoutId.current = window.setTimeout(
				() => setDelayedLoading(true),
				delay,
			);
		}

		return () => {
			clearLoadTimeout();
		};
	}, [delay, loading, clearLoadTimeout]);

	return [delayedLoading, setLoading];
};

export function useResizeState(nodeKey: string) {
	const [isResizing, setIsResizing] = useState(false);
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const [isExpanded, setIsExpanded] = useState(false);

	return {
		isResizing,
		setIsResizing,
		isSelected,
		setSelected,
		clearSelection,
		isExpanded,
		setIsExpanded,
	};
}

export function useResizeCommands(
	editor: LexicalEditor,
	isExpanded: boolean,
	setIsExpanded: Dispatch<SetStateAction<boolean>>,
	isResizing: boolean,
	nodeKey: string,
	setSelected: (arg0: boolean) => void,
	clearSelection: () => void,
	elementRef: React.RefObject<HTMLElement>,
) {
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
							elementRef.current,
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
						elementRef.current?.scrollIntoView({
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
}
