import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import { Events as WailsEvents } from "@wailsio/runtime";
import { useSetAtom } from "jotai";
import {
	CLICK_COMMAND,
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_LOW,
	KEY_BACKSPACE_COMMAND,
	KEY_ENTER_COMMAND,
	KEY_ESCAPE_COMMAND,
	type LexicalEditor,
} from "lexical";
import {
	type Dispatch,
	type RefObject,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";
import { darkModeAtom } from "../atoms";
import {
	EXPAND_CONTENT_COMMAND,
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
		if (!loading) setDelayedLoading(false);
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
	isSelected: boolean,
	isResizing: boolean,
	nodeKey: string,
	setSelected: (arg0: boolean) => void,
	clearSelection: () => void,
	elementRef: React.RefObject<HTMLElement>,
) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		return mergeRegister(
			// editor.registerCommand<KeyboardEvent>(
			// 	KEY_ARROW_UP_COMMAND,
			// 	(e) => {
			// 		// if (!isExpanded) {
			// 		// 	return arrowKeyDecoratorNodeCommand(e, nodeKey, true);
			// 		// }
			// 		e.preventDefault();
			// 		e.stopPropagation();
			// 		return true;
			// 	},
			// 	isExpanded || isSelected
			// 		? COMMAND_PRIORITY_HIGH
			// 		: COMMAND_PRIORITY_EDITOR,
			// ),
			// editor.registerCommand<KeyboardEvent>(
			// 	KEY_ARROW_DOWN_COMMAND,
			// 	(e) => {
			// 		// if (!isExpanded) {
			// 		// 	return arrowKeyDecoratorNodeCommand(e, nodeKey, false);
			// 		// }
			// 		console.log("ran");
			// 		e.preventDefault();
			// 		e.stopPropagation();
			// 		return true;
			// 	},
			// 	isExpanded || isSelected
			// 		? COMMAND_PRIORITY_HIGH
			// 		: COMMAND_PRIORITY_EDITOR,
			// ),
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
				isExpanded || isSelected ? COMMAND_PRIORITY_HIGH : COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand<KeyboardEvent>(
				KEY_ESCAPE_COMMAND,
				(e) => {
					e.preventDefault();
					e.stopPropagation();
					if (!isExpanded) {
						return escapeKeyDecoratorNodeCommand(nodeKey);
					}
					return true;
				},
				isExpanded || isSelected ? COMMAND_PRIORITY_HIGH : COMMAND_PRIORITY_LOW,
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
				isExpanded || isSelected ? COMMAND_PRIORITY_HIGH : COMMAND_PRIORITY_LOW,
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
				isExpanded || isSelected ? COMMAND_PRIORITY_HIGH : COMMAND_PRIORITY_LOW,
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

export function useOnClickOutside<T extends HTMLElement>(
	ref: RefObject<T>,
	handler: (event: MouseEvent | TouchEvent) => void,
): void {
	useEffect(
		() => {
			const listener = (event: MouseEvent | TouchEvent): void => {
				// Do nothing if clicking ref's element or descendent elements
				if (!ref.current || ref.current.contains(event.target as Node)) {
					return;
				}

				handler(event);
			};

			// Add event listeners
			document.addEventListener("mousedown", listener);
			document.addEventListener("touchstart", listener);

			// Remove event listeners on cleanup
			return () => {
				document.removeEventListener("mousedown", listener);
				document.removeEventListener("touchstart", listener);
			};
		},
		// Re-run if ref or handler changes
		[ref, handler],
	);
}

export function useDarkModeSetting() {
	const setDarkMode = useSetAtom(darkModeAtom);
	useEffect(() => {
		const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)");
		setDarkMode(isDarkMode.matches);

		window
			.matchMedia("(prefers-color-scheme: dark)")
			.addEventListener("change", (event) =>
				event.matches ? setDarkMode(true) : setDarkMode(false),
			);
		return () => {
			window
				.matchMedia("(prefers-color-scheme: dark)")
				.removeEventListener("change", (event) =>
					event.matches ? setDarkMode(true) : setDarkMode(false),
				);
		};
	}, [setDarkMode]);
}

const dropImage = (e: DragEvent) => {
	// @ts-expect-error this comes from wails, no types
	const currentFiles = input.files;
	// @ts-expect-error this comes from wails, no types
	chrome.webview.postMessageWithAdditionalObjects("FilesDropped", currentFiles);
	e.preventDefault();
	e.stopPropagation();
	return false;
};

export function useImageDrop() {
	useEffect(() => {
		document.body.addEventListener("drop", dropImage);
		return () => {
			document.body.removeEventListener("drop", dropImage);
		};
	}, []);
}

type WailsEvent = {
	name: string;
	sender: string;
	data: unknown;
};

export function useWailsEvent(
	eventName: string,
	callback: (res: WailsEvent) => void,
) {
	// @ts-expect-error the events function can be returned
	useEffect(() => {
		return WailsEvents.On(eventName, callback);
	}, [eventName, callback]);
}
