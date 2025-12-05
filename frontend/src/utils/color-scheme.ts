import type { Dispatch, SetStateAction } from 'react';
/**
 * @param isDarkMode - Flag to determine if dark mode is enabled
 * @param setIsDarkModeOn - State setter function to update dark mode state
 */
export function addColorSchemeClassToBody(
  isDarkMode: boolean,
  setIsDarkModeOn: Dispatch<SetStateAction<boolean>>
) {
  setIsDarkModeOn(isDarkMode);

  const rootElement = document.documentElement;

  // Add or remove the 'dark' class only on the html element
  if (isDarkMode) {
    rootElement.classList.add('dark');
    rootElement.style.colorScheme = 'dark';
  } else {
    rootElement.classList.remove('dark');
    rootElement.style.colorScheme = 'light';
  }
}
