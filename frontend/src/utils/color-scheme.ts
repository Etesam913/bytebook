import type { Dispatch, SetStateAction } from "react";
import type { DarkModeData } from "../types";

export function addColorSchemeClassToBody(
	isDarkMode: boolean,
	setDarkModeData: Dispatch<SetStateAction<DarkModeData>>,
) {
	// Update the dark mode state in the application
	setDarkModeData((prev) => ({ ...prev, isDarkModeOn: isDarkMode }));

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
