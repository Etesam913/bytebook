type ValidatedProjectSettings = {
  theme: 'light' | 'dark' | 'system';
  noteWidth: 'fullWidth' | 'readability';
};

export const DEFAULT_EDITOR_FONT_SIZE = 14;
export const MIN_EDITOR_FONT_SIZE = 8;
export const MAX_EDITOR_FONT_SIZE = 24;

/**
 * Validates the project settings and ensures they conform to the expected types.
 * If the provided settings are not valid, default values are used.
 *
 * @param settings - The project settings to validate.
 * @param settings.theme - The dark mode setting, expected to be 'light', 'dark', or 'system'.
 * @param settings.noteWidth - The note width setting, expected to be 'fullWidth' or 'readability'.
 * @returns The validated project settings.
 */
export function validateProjectSettings(settings: {
  theme: string;
  noteWidth: string;
}): ValidatedProjectSettings {
  const themeOptions = ['light', 'dark', 'system'] as const;
  const noteWidthOptions = ['fullWidth', 'readability'] as const;

  const theme = (themeOptions as readonly string[]).includes(settings.theme)
    ? (settings.theme as 'light' | 'dark' | 'system')
    : 'system';

  const noteWidth = (noteWidthOptions as readonly string[]).includes(
    settings.noteWidth
  )
    ? (settings.noteWidth as 'fullWidth' | 'readability')
    : 'readability';

  return {
    theme,
    noteWidth,
  };
}

export function validateEditorFontSize(fontSize: unknown): number {
  if (typeof fontSize === 'number' && Number.isFinite(fontSize)) {
    return Math.min(
      MAX_EDITOR_FONT_SIZE,
      Math.max(MIN_EDITOR_FONT_SIZE, Math.round(fontSize))
    );
  }

  return DEFAULT_EDITOR_FONT_SIZE;
}
