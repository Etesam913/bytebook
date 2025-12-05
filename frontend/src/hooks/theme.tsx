import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import {
  isDarkModeOnAtom,
  projectSettingsAtom,
  projectSettingsLoadedAtom,
} from '../atoms';
import { addColorSchemeClassToBody } from '../utils/color-scheme';

/**
 * Custom hook to manage and apply the dark mode setting based on project settings.
 * It listens to system color scheme changes and updates the application theme accordingly.
 */
export function useThemeSetting() {
  const projectSettings = useAtomValue(projectSettingsAtom);
  const projectSettingsLoaded = useAtomValue(projectSettingsLoadedAtom);
  const setIsDarkModeOn = useSetAtom(isDarkModeOnAtom);
  // Memoize the handler to ensure the same reference is used
  const handleColorSchemeChange = (event: MediaQueryListEvent) =>
    addColorSchemeClassToBody(event.matches, setIsDarkModeOn);

  useEffect(() => {
    if (!projectSettingsLoaded) return;

    const isDarkModeEvent = window.matchMedia('(prefers-color-scheme: dark)');

    // Cache the theme preference in localStorage to prevent white flash on reload
    try {
      localStorage.setItem(
        'bytebook-theme-preference',
        projectSettings.appearance.theme
      );
    } catch {
      // Ignore localStorage errors
    }

    // Check the current dark mode setting and apply the appropriate color scheme
    if (projectSettings.appearance.theme === 'system') {
      // If the setting is "system", use the system's color scheme preference
      addColorSchemeClassToBody(isDarkModeEvent.matches, setIsDarkModeOn);
      isDarkModeEvent.addEventListener('change', handleColorSchemeChange);
    } else if (projectSettings.appearance.theme === 'light') {
      // If the setting is "light", force light mode
      addColorSchemeClassToBody(false, setIsDarkModeOn);
    } else {
      // If the setting is "dark", force dark mode
      addColorSchemeClassToBody(true, setIsDarkModeOn);
    }

    // Cleanup the event listener on component unmount
    return () => {
      isDarkModeEvent.removeEventListener('change', handleColorSchemeChange);
    };
  }, [projectSettingsLoaded, projectSettings.appearance.theme]);
}
