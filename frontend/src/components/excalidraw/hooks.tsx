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
			const grandchild = firstChild.firstChild as HTMLElement;
			if (!grandchild) return;
			const excalidrawParent = grandchild.lastChild as HTMLDivElement;

			if (excalidrawParent) {
				excalidrawParent.focus();
			}
		}
	}, [isSelected]);
}
