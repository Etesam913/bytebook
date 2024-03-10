import { useEffect } from "react";

export const useTrapFocus = (
	element: HTMLElement | null,
	isActive: boolean,
): void => {
	useEffect(() => {
		if (!isActive || !element) {
			return;
		}

		const focusableSelectors =
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
		const focusableElements = Array.from(
			element.querySelectorAll(focusableSelectors),
		);
		const firstFocusableElement = focusableElements.at(0) as
			| HTMLElement
			| undefined;

		const lastFocusableElement = focusableElements.at(
			focusableElements.length - 1,
		) as HTMLElement | undefined;

		const handleKeyDown = (e: KeyboardEvent) => {
			const isTabPressed = e.key === "Tab" || e.keyCode === 9;

			if (!isTabPressed) {
				return;
			}

			if (e.shiftKey) {
				/* shift + tab */
				if (document.activeElement === firstFocusableElement) {
					lastFocusableElement?.focus();
					e.preventDefault();
				}
			} else {
				/* tab */
				if (document.activeElement === lastFocusableElement) {
					console.log("prevented");
					firstFocusableElement?.focus();
					e.preventDefault();
				}
			}
		};

		firstFocusableElement?.focus();
		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [element, isActive]);
};
