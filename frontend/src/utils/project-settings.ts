import {
  LANGUAGES,
  type Frontmatter,
  type Languages,
  type ProjectSettings,
} from '@/types';
import type { ProjectSettingsJson } from '@bindings/config/models';
import { normalizeSidebarOrder } from './sidebar-panels';
import { parseRGB } from './string-formatting';

export const DEFAULT_ACCENT_COLOR = 'rgb(96, 165, 250)';
export const DEFAULT_UI_FONT_FAMILY = 'ui-sans-serif';
export const DEFAULT_CODE_BLOCK_FONT_FAMILY = 'monospace';

type ValidatedProjectSettings = {
  theme: 'light' | 'dark' | 'system';
  noteWidth: 'fullWidth' | 'readability';
};

export const DEFAULT_EDITOR_FONT_SIZE = 14;
export const MIN_EDITOR_FONT_SIZE = 8;
export const MAX_EDITOR_FONT_SIZE = 24;

export const DEFAULT_EDITOR_LINE_HEIGHT = 2;
export const MIN_EDITOR_LINE_HEIGHT = 1.2;
export const MAX_EDITOR_LINE_HEIGHT = 3;
export const EDITOR_LINE_HEIGHT_STEP = 0.1;

export const DEFAULT_CODE_BLOCK_FONT_SIZE = 13;
export const MIN_CODE_BLOCK_FONT_SIZE = 8;
export const MAX_CODE_BLOCK_FONT_SIZE = 24;

export const DEFAULT_CODE_BLOCK_LANGUAGE: Languages = LANGUAGES.PYTHON;

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

// Clamps and rounds a font size value to the allowed editor range, returning the default if invalid.
export function validateEditorFontSize(fontSize: unknown): number {
  if (typeof fontSize === 'number' && Number.isFinite(fontSize)) {
    return Math.min(
      MAX_EDITOR_FONT_SIZE,
      Math.max(MIN_EDITOR_FONT_SIZE, Math.round(fontSize))
    );
  }

  return DEFAULT_EDITOR_FONT_SIZE;
}

// Clamps a line height multiplier to the allowed range and rounds it to one decimal place, returning the default if invalid.
export function validateEditorLineHeight(lineHeight: unknown): number {
  if (typeof lineHeight === 'number' && Number.isFinite(lineHeight)) {
    const clamped = Math.min(
      MAX_EDITOR_LINE_HEIGHT,
      Math.max(MIN_EDITOR_LINE_HEIGHT, lineHeight)
    );
    return Math.round(clamped * 10) / 10;
  }

  return DEFAULT_EDITOR_LINE_HEIGHT;
}

// Clamps and rounds a font size value to the allowed code block range, returning the default if invalid.
export function validateCodeBlockFontSize(fontSize: unknown): number {
  if (typeof fontSize === 'number' && Number.isFinite(fontSize)) {
    return Math.min(
      MAX_CODE_BLOCK_FONT_SIZE,
      Math.max(MIN_CODE_BLOCK_FONT_SIZE, Math.round(fontSize))
    );
  }

  return DEFAULT_CODE_BLOCK_FONT_SIZE;
}

// Determines whether the table of contents should be shown for a note.
// An explicit frontmatter value ('true'/'false') always wins; the project
// setting is only the fallback when the frontmatter key is absent.
export function isTableOfContentsVisible({
  frontmatter,
  projectSettings,
}: {
  frontmatter: Frontmatter;
  projectSettings: ProjectSettings;
}): boolean {
  if (frontmatter.showTableOfContents !== undefined) {
    return frontmatter.showTableOfContents === 'true';
  }
  return projectSettings.appearance.showTableOfContentsByDefault;
}

// Returns the language if it is a supported code block language, otherwise the default.
export function validateCodeBlockDefaultLanguage(language: unknown): Languages {
  const languageOptions = Object.values(LANGUAGES) as readonly string[];
  if (typeof language === 'string' && languageOptions.includes(language)) {
    return language as Languages;
  }

  return DEFAULT_CODE_BLOCK_LANGUAGE;
}

// Pure: converts the raw backend payload into the typed settings the app uses. No DOM writes.
export function normalizeProjectSettings(
  data: ProjectSettingsJson
): ProjectSettings {
  const { pinnedNotes, appearance, code } = data;
  const {
    theme,
    noteWidth,
    accentColor,
    editorFontSize,
    editorLineHeight,
    showTableOfContentsByDefault,
    uiFontFamily,
    sidebarOrder,
    sidebarVisibility,
  } = appearance;

  const {
    codeBlockFontFamily,
    codeBlockFontSize,
    codeBlockLineWrapping,
    codeBlockShowLineNumbers,
    codeBlockDefaultLanguage,
  } = code;

  const validated = validateProjectSettings({ theme, noteWidth });

  return {
    ...data,
    pinnedNotes: new Set(pinnedNotes),
    appearance: {
      ...appearance,
      accentColor: parseRGB(accentColor) ? accentColor : DEFAULT_ACCENT_COLOR,
      editorFontSize: validateEditorFontSize(editorFontSize),
      editorLineHeight: validateEditorLineHeight(editorLineHeight),
      showTableOfContentsByDefault: showTableOfContentsByDefault ?? false,
      uiFontFamily: uiFontFamily ?? DEFAULT_UI_FONT_FAMILY,
      theme: validated.theme,
      noteWidth: validated.noteWidth,
      sidebarOrder: normalizeSidebarOrder(sidebarOrder),
      sidebarVisibility: {
        hidePinned: sidebarVisibility?.hidePinned ?? false,
        hideRecent: sidebarVisibility?.hideRecent ?? false,
        hideKernels: sidebarVisibility?.hideKernels ?? false,
        hideTags: sidebarVisibility?.hideTags ?? false,
        hideSavedSearches: sidebarVisibility?.hideSavedSearches ?? false,
      },
    },
    code: {
      ...code,
      codeBlockFontFamily: codeBlockFontFamily ?? '',
      codeBlockFontSize: validateCodeBlockFontSize(codeBlockFontSize),
      codeBlockLineWrapping: codeBlockLineWrapping ?? false,
      codeBlockShowLineNumbers: codeBlockShowLineNumbers ?? false,
      codeBlockDefaultLanguage: validateCodeBlockDefaultLanguage(
        codeBlockDefaultLanguage
      ),
    },
  };
}
