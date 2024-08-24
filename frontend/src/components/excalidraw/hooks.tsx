import { type RefObject, useEffect } from "react";

/**
 * When the excalidraw node is selected it should be focused on so that you can use hotkeys
 */
export function useFocusOnSelect(
	isSelected: boolean,
	excalidrawRef: RefObject<HTMLDivElement | null>,
) {
	useEffect(() => {
		if (isSelected && excalidrawRef.current) {
			const excalidrawElement = excalidrawRef.current.lastChild
				?.lastChild as HTMLElement;
			if (!excalidrawElement) return;

			excalidrawElement.focus();
		}
	}, [isSelected, excalidrawRef]);
}
