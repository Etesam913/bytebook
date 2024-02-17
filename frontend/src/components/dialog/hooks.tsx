import { type RefObject, useEffect } from "react";

export const useTrapFocus = (
	ref: RefObject<HTMLElement>,
	isActive: boolean,
): void => {
	useEffect(() => {
		if (!isActive || !ref.current) {
			return;
		}

		const element = ref.current;

		const focusableSelectors =
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
		const focusableElements = Array.from(
			element.querySelectorAll(focusableSelectors),
		);
		const firstFocusableElement = focusableElements[0] as
			| HTMLElement
			| undefined;
		const lastFocusableElement = focusableElements[
			focusableElements.length - 1
		] as HTMLElement | undefined;

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
	}, [ref, isActive]);
};
