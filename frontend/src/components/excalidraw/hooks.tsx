import { useEffect } from "react";

/**
 * When the excalidraw node is selected it should be focused on so that you can use hotkeys
 */
export function useFocusOnSelect(
	isSelected: boolean,
	excalidrawContainer: HTMLDivElement | null,
) {
	useEffect(() => {
		if (isSelected && excalidrawContainer) {
			const firstChild = excalidrawContainer.firstChild as HTMLElement;
			if (!firstChild) return;
			firstChild.focus();
		}
	}, [isSelected]);
}
