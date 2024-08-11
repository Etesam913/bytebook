import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import { Events as WailsEvents } from "@wailsio/runtime";
import { useSetAtom } from "jotai";
import {
	CLICK_COMMAND,
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_LOW,
	COMMAND_PRIORITY_NORMAL,
	KEY_ENTER_COMMAND,
	type LexicalEditor,
} from "lexical";
import {
	type Dispatch,
	type RefObject,
	type SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useSearch } from "wouter";
import { darkModeAtom } from "../atoms";
import {
	EXPAND_CONTENT_COMMAND,
	enterKeyDecoratorNodeCommand,
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
	disabledEvents?: Record<string, boolean>,
) {
	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<MouseEvent>(
				CLICK_COMMAND,
				(e) => {
					if (disabledEvents?.click) return false;
					if (!isExpanded) {
						return onClickDecoratorNodeCommand(
							e,
							elementRef.current,
							setSelected,
							clearSelection,
							isResizing,
						);
					}

					e.preventDefault();
					e.stopPropagation();
					return true;
				},
				COMMAND_PRIORITY_NORMAL,
			),
			editor.registerCommand<KeyboardEvent>(
				KEY_ENTER_COMMAND,
				(e) => {
					if (disabledEvents?.enter) return false;
					if (!isExpanded) {
						return enterKeyDecoratorNodeCommand(e, nodeKey);
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
	}, [
		editor,
		nodeKey,
		isResizing,
		isExpanded,
		setIsExpanded,
		isSelected,
		elementRef.current,
		clearSelection,
	]);
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

/** Sets dark mode based off of window prefers-color-scheme */
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

// const dropImage = (e: DragEvent) => {
// 	// @ts-expect-error this comes from wails, no types
// 	const currentFiles = input.files;
// 	// @ts-expect-error this comes from wails, no types
// 	chrome.webview.postMessageWithAdditionalObjects("FilesDropped", currentFiles);
// 	e.preventDefault();
// 	e.stopPropagation();
// 	return false;
// };

// export function useImageDrop() {
// 	useEffect(() => {
// 		document.body.addEventListener("drop", dropImage);
// 		return () => {
// 			document.body.removeEventListener("drop", dropImage);
// 		};
// 	}, []);
// }

type WailsEvent = {
	name: string;
	sender: string;
	data: unknown;
};

/** Helper to do something when a wails event is emitted from the backend */
export function useWailsEvent(
	eventName: string,
	callback: (res: WailsEvent) => void,
) {
	// @ts-expect-error the events function can be returned
	useEffect(() => {
		return WailsEvents.On(eventName, callback);
	}, [eventName, callback]);
}

export function useSearchParamsEntries() {
	const searchString = useSearch();
	const searchParamsObject = useMemo(() => {
		const searchParams = new URLSearchParams(searchString);
		return Object.fromEntries(searchParams.entries());
	}, [searchString]);
	return searchParamsObject;
}

/**
Can be used to tell if a note is in standalone mode by looking at the ?standalone query value
Standalone mode is when a note is opened in a new window
*/
export function useIsStandalone() {
	const searchParamsObject = useSearchParamsEntries();

	const isStandalone = searchParamsObject?.standalone === "true";
	return isStandalone;
}

type KeyMap = {
	[keyCombination: string]: (event: KeyboardEvent) => void;
};

const useHotkeys = (keyMap: KeyMap): void => {
	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			const { key, ctrlKey, shiftKey, altKey, metaKey } = event;
			const keyCombination = `${ctrlKey ? "Ctrl+" : ""}${
				shiftKey ? "Shift+" : ""
			}${altKey ? "Alt+" : ""}${metaKey ? "Meta+" : ""}${key}`;

			if (keyMap[keyCombination]) {
				keyMap[keyCombination](event);
			}
		},
		[keyMap],
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [handleKeyDown]);
};

export default useHotkeys;
