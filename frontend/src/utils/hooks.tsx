import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import { Events as WailsEvents } from "@wailsio/runtime";
import { useAtom } from "jotai";
import {
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_LOW,
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
import { addColorSchemeClassToBody } from "./color-scheme";
import {
	EXPAND_CONTENT_COMMAND,
	enterKeyDecoratorNodeCommand,
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
	nodeKey: string,
	clearSelection: () => void,
	elementRef: React.RefObject<HTMLElement | null>,
	disabledEvents?: Record<string, boolean>,
) {
	useEffect(() => {
		return mergeRegister(
			// editor.registerCommand<KeyboardEvent>(
			// 	KEY_ENTER_COMMAND,
			// 	(e) => {
			// 		if (disabledEvents?.enter) return false;
			// 		if (!isExpanded) {
			// 			return enterKeyDecoratorNodeCommand(e, nodeKey);
			// 		}
			// 		e.preventDefault();
			// 		e.stopPropagation();
			// 		return true;
			// 	},
			// 	isExpanded || isSelected ? COMMAND_PRIORITY_HIGH : COMMAND_PRIORITY_LOW,
			// ),
			editor.registerCommand<string>(
				EXPAND_CONTENT_COMMAND,
				(keyToExpand) => {
					if (keyToExpand === nodeKey) {
						setIsExpanded(true);
						elementRef.current?.scrollIntoView({
							block: "end",
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
export function useDarkModeSetting() {
	const [darkModeData, setDarkModeData] = useAtom(darkModeAtom);

	// Memoize the handler to ensure the same reference is used
	const handleColorSchemeChange = useCallback(
		(event: MediaQueryListEvent) =>
			addColorSchemeClassToBody(event.matches, setDarkModeData),
		[setDarkModeData, darkModeData],
	);

	useEffect(() => {
		const isDarkModeEvent = window.matchMedia("(prefers-color-scheme: dark)");

		// Check the current dark mode setting and apply the appropriate color scheme
		if (darkModeData.darkModeSetting === "system") {
			// If the setting is "system", use the system's color scheme preference
			setDarkModeData((prev) => {
				const updatedData = { ...prev, isDarkModeOn: isDarkModeEvent.matches };
				localStorage.setItem("darkModeData", JSON.stringify(updatedData));
				return updatedData;
			});
			addColorSchemeClassToBody(isDarkModeEvent.matches, setDarkModeData);
			isDarkModeEvent.addEventListener("change", handleColorSchemeChange);
		} else if (darkModeData.darkModeSetting === "light") {
			// If the setting is "light", force light mode
			addColorSchemeClassToBody(false, setDarkModeData);
		} else {
			// If the setting is "dark", force dark mode
			addColorSchemeClassToBody(true, setDarkModeData);
		}

		// Cleanup the event listener on component unmount
		return () => {
			isDarkModeEvent.removeEventListener("change", handleColorSchemeChange);
		};
	}, [setDarkModeData, darkModeData.darkModeSetting]);
}

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
