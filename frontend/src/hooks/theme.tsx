import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import { isDarkModeOnAtom, projectSettingsAtom } from "../atoms";
import { addColorSchemeClassToBody } from "../utils/color-scheme";

/**
 * Custom hook to manage and apply the dark mode setting based on project settings.
 * It listens to system color scheme changes and updates the application theme accordingly.
 */
export function useDarkModeSetting() {
	const projectSettings = useAtomValue(projectSettingsAtom);
	const setIsDarkModeOn = useSetAtom(isDarkModeOnAtom);
	// Memoize the handler to ensure the same reference is used
	const handleColorSchemeChange = useCallback(
		(event: MediaQueryListEvent) =>
			addColorSchemeClassToBody(event.matches, setIsDarkModeOn),
		[setIsDarkModeOn],
	);

	useEffect(() => {
		const isDarkModeEvent = window.matchMedia("(prefers-color-scheme: dark)");

		// Check the current dark mode setting and apply the appropriate color scheme
		if (projectSettings.darkMode === "system") {
			// If the setting is "system", use the system's color scheme preference
			addColorSchemeClassToBody(isDarkModeEvent.matches, setIsDarkModeOn);
			isDarkModeEvent.addEventListener("change", handleColorSchemeChange);
		} else if (projectSettings.darkMode === "light") {
			// If the setting is "light", force light mode
			addColorSchemeClassToBody(false, setIsDarkModeOn);
		} else {
			// If the setting is "dark", force dark mode
			addColorSchemeClassToBody(true, setIsDarkModeOn);
		}

		// Cleanup the event listener on component unmount
		return () => {
			isDarkModeEvent.removeEventListener("change", handleColorSchemeChange);
		};
	}, [projectSettings.darkMode]);
}
