type ValidatedProjectSettings = {
  theme: 'light' | 'dark' | 'system';
  noteSidebarItemSize: 'list' | 'card';
  noteWidth: 'fullWidth' | 'readability';
};

/**
 * Validates the project settings and ensures they conform to the expected types.
 * If the provided settings are not valid, default values are used.
 *
 * @param settings - The project settings to validate.
 * @param settings.theme - The dark mode setting, expected to be 'light', 'dark', or 'system'.
 * @param settings.noteSidebarItemSize - The note sidebar item size setting, expected to be 'list' or 'card'.
 * @param settings.noteWidth - The note width setting, expected to be 'fullWidth' or 'readability'.
 * @returns The validated project settings.
 */
export function validateProjectSettings(settings: {
  theme: string;
  noteSidebarItemSize: string;
  noteWidth: string;
}): ValidatedProjectSettings {
  const themeOptions = ['light', 'dark', 'system'] as const;
  const sidebarSizeOptions = ['list', 'card'] as const;
  const noteWidthOptions = ['fullWidth', 'readability'] as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const theme = themeOptions.includes(settings.theme as any)
    ? (settings.theme as 'light' | 'dark' | 'system')
    : 'system';

  const noteSidebarItemSize = sidebarSizeOptions.includes(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings.noteSidebarItemSize as any
  )
    ? (settings.noteSidebarItemSize as 'list' | 'card')
    : 'card';

  const noteWidth = noteWidthOptions.includes(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings.noteWidth as any
  )
    ? (settings.noteWidth as 'fullWidth' | 'readability')
    : 'readability';

  return {
    theme,
    noteSidebarItemSize,
    noteWidth,
  };
}
