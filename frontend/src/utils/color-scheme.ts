import type { Dispatch, SetStateAction } from 'react';

// Applies or removes the dark mode class and color-scheme style on the root HTML element.
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
