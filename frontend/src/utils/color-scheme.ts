import type { Dispatch, SetStateAction } from "react";
/**
 * @param isDarkMode - Flag to determine if dark mode is enabled
 * @param setIsDarkModeOn - State setter function to update dark mode state
 */
export function addColorSchemeClassToBody(
	isDarkMode: boolean,
	setIsDarkModeOn: Dispatch<SetStateAction<boolean>>,
) {
	setIsDarkModeOn(isDarkMode);

	// Get the body element from the document
	const bodyElement = document.querySelector("body");
	if (!bodyElement) return;

	// Add or remove the 'dark' class based on the isDarkMode flag
	if (isDarkMode) {
		bodyElement.classList.add("dark");
		bodyElement.style.colorScheme = "dark";
	} else {
		bodyElement.classList.remove("dark");
		bodyElement.style.colorScheme = "light";
	}
}
