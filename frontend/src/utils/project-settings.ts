type ValidatedProjectSettings = {
  theme: 'light' | 'dark' | 'system';
  noteWidth: 'fullWidth' | 'readability';
};

/**
 * Validates the project settings and ensures they conform to the expected types.
 * If the provided settings are not valid, default values are used.
 *
 * settings.theme - The dark mode setting, expected to be 'light', 'dark', or 'system'.
 * settings.noteWidth - The note width setting, expected to be 'fullWidth' or 'readability'.
 */
export function validateProjectSettings(settings: {
  theme: string;
  noteWidth: string;
}): ValidatedProjectSettings {
  const themeOptions = ['light', 'dark', 'system'] as const;
  const noteWidthOptions = ['fullWidth', 'readability'] as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const theme = themeOptions.includes(settings.theme as any)
    ? (settings.theme as 'light' | 'dark' | 'system')
    : 'system';

  const noteWidth = noteWidthOptions.includes(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings.noteWidth as any
  )
    ? (settings.noteWidth as 'fullWidth' | 'readability')
    : 'readability';

  return {
    theme,
    noteWidth,
  };
}
