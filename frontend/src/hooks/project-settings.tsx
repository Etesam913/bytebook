import { useMutation, useQuery } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { logger } from '@utils/logging';
import { useEffect } from 'react';
import {
  GetProjectSettings,
  UpdateProjectSettings,
} from '@bindings/services/settingsservice';
import {
  dialogDataAtom,
  projectSettingsAtom,
  projectSettingsLoadedAtom,
} from '@/atoms';
import { SettingsDialog } from '@components/settings-dialog';
import { useWailsEvent } from '@hooks/events';
import type { ProjectSettings } from '@/types';
import {
  validateCodeBlockDefaultLanguage,
  validateCodeBlockFontSize,
  validateEditorFontSize,
  validateEditorLineHeight,
  validateProjectSettings,
} from '@utils/project-settings';
import {
  isEventInCurrentWindow,
  SETTINGS_OPEN,
  SETTINGS_UPDATE,
} from '@utils/events';
import { parseRGB } from '@utils/string-formatting';
import { QueryError } from '@utils/query';
import { queryKeys } from '@utils/query-keys';
import { ProjectSettingsJson } from '@bindings/config/models';

const DEFAULT_ACCENT_COLOR = 'rgb(96, 165, 250)';
const DEFAULT_UI_FONT_FAMILY = 'ui-sans-serif';
const DEFAULT_CODE_BLOCK_FONT_FAMILY = 'monospace';

function updateAccentColorVariable(accentColor: string) {
  let rgbValues = parseRGB(accentColor);
  if (!rgbValues) {
    rgbValues = parseRGB(DEFAULT_ACCENT_COLOR);
  }
  if (!rgbValues) return;

  document.documentElement.style.setProperty(
    '--accent-color-values',
    `${rgbValues.r},${rgbValues.g},${rgbValues.b}`
  );
}

function updateEditorFontSizeVariable(fontSize: unknown) {
  const validatedFontSize = validateEditorFontSize(fontSize);
  document.documentElement.style.setProperty(
    '--editor-font-size-base',
    `${validatedFontSize}px`
  );
}

function updateEditorLineHeightVariable(lineHeight: unknown) {
  const validatedLineHeight = validateEditorLineHeight(lineHeight);
  document.documentElement.style.setProperty(
    '--editor-line-height',
    String(validatedLineHeight)
  );
}

function updateCodeBlockFontSizeVariable(fontSize: unknown) {
  const validatedFontSize = validateCodeBlockFontSize(fontSize);
  document.documentElement.style.setProperty(
    '--code-block-font-size-base',
    `${validatedFontSize}px`
  );
}

function updateFontFamilyVariable(
  variableName: string,
  fontFamily: unknown,
  defaultFontFamily: string
) {
  document.documentElement.style.setProperty(
    variableName,
    typeof fontFamily === 'string' && fontFamily.trim().length > 0
      ? fontFamily
      : defaultFontFamily
  );
}
/**
 * Validates project settings from the server.
 *
 * @returns  The validated project settings.
 * @throws  If the fetch operation fails or returns invalid data.
 */
function validateProjectSettingsWrapper(data: ProjectSettingsJson) {
  const { theme, noteWidth } = validateProjectSettings({
    theme: data.appearance.theme,
    noteWidth: data.appearance.noteWidth,
  });
  const editorFontSize = validateEditorFontSize(data.appearance.editorFontSize);
  const editorLineHeight = validateEditorLineHeight(
    data.appearance.editorLineHeight
  );
  const codeBlockFontSize = validateCodeBlockFontSize(
    data.code.codeBlockFontSize
  );
  const codeBlockDefaultLanguage = validateCodeBlockDefaultLanguage(
    data.code.codeBlockDefaultLanguage
  );
  const accentColor = parseRGB(data.appearance.accentColor)
    ? data.appearance.accentColor
    : DEFAULT_ACCENT_COLOR;

  updateAccentColorVariable(accentColor);
  updateEditorFontSizeVariable(editorFontSize);
  updateEditorLineHeightVariable(editorLineHeight);
  updateCodeBlockFontSizeVariable(codeBlockFontSize);
  updateFontFamilyVariable(
    '--app-font-family',
    data.appearance.uiFontFamily,
    DEFAULT_UI_FONT_FAMILY
  );
  updateFontFamilyVariable(
    '--code-block-font-family',
    data.code.codeBlockFontFamily,
    DEFAULT_CODE_BLOCK_FONT_FAMILY
  );

  return {
    ...data,
    pinnedNotes: new Set(data.pinnedNotes),
    appearance: {
      ...data.appearance,
      accentColor,
      editorFontSize,
      editorLineHeight,
      showTableOfContentsByDefault:
        data.appearance.showTableOfContentsByDefault ?? false,
      uiFontFamily: data.appearance.uiFontFamily ?? DEFAULT_UI_FONT_FAMILY,
      theme,
      noteWidth,
      sidebarVisibility: {
        hidePinned: data.appearance.sidebarVisibility?.hidePinned ?? false,
        hideRecent: data.appearance.sidebarVisibility?.hideRecent ?? false,
        hideKernels: data.appearance.sidebarVisibility?.hideKernels ?? false,
        hideTags: data.appearance.sidebarVisibility?.hideTags ?? false,
        hideSavedSearches:
          data.appearance.sidebarVisibility?.hideSavedSearches ?? false,
      },
    },
    code: {
      ...data.code,
      codeBlockFontFamily: data.code.codeBlockFontFamily ?? '',
      codeBlockFontSize,
      codeBlockLineWrapping: data.code.codeBlockLineWrapping ?? false,
      codeBlockShowLineNumbers: data.code.codeBlockShowLineNumbers ?? false,
      codeBlockDefaultLanguage,
    },
  };
}
/**
 * Custom hook to manage project settings.
 *
 * This hook fetches and validates project settings on component initialization,
 * opens the settings dialog on 'settings:open' event, and re-fetches settings
 * on 'settings:update' event.
 */
export function useProjectSettings() {
  const setProjectSettings = useSetAtom(projectSettingsAtom);
  const setProjectSettingsLoaded = useSetAtom(projectSettingsLoadedAtom);
  const setDialogData = useSetAtom(dialogDataAtom);

  const { data: settings } = useQuery({
    queryKey: queryKeys.projectSettings(),
    queryFn: async () => {
      const { success, message, data } = await GetProjectSettings();
      if (!success || !data) {
        throw new QueryError(message);
      }
      return validateProjectSettingsWrapper(data);
    },
  });

  useEffect(() => {
    if (!settings) return;
    setProjectSettings(settings);
    setProjectSettingsLoaded(true);
  }, [settings]);

  // Open the settings dialog on 'settings:open' event.
  useWailsEvent(SETTINGS_OPEN, (data) => {
    void (async () => {
      if (!(await isEventInCurrentWindow(data))) return;
      logger.event(SETTINGS_OPEN, data);
      setDialogData({
        isOpen: true,
        isPending: false,
        title: 'Settings',
        dialogClassName: 'w-[min(55rem,90vw)] rounded-2xl',
        children: () => <SettingsDialog />,
        onSubmit: async () => Promise.resolve(true),
      });
    })();
  });

  // Re-run the mutation when a 'settings:update' event is received.
  useWailsEvent(SETTINGS_UPDATE, (body) => {
    setProjectSettings(validateProjectSettingsWrapper(body.data));
    setProjectSettingsLoaded(true);
  });
}

/**
 * Custom hook to create a mutation for updating project settings.
 *
 * This hook uses react-query's useMutation to handle the update operation.
 * It takes new project settings, sends them to the backend, and handles
 * success and error responses.
 *
 * @returns  Te mutation object from useMutation.
 */
export function useUpdateProjectSettingsMutation() {
  return useMutation({
    onMutate: ({ newProjectSettings }) => {
      updateEditorFontSizeVariable(
        newProjectSettings.appearance.editorFontSize
      );
      updateEditorLineHeightVariable(
        newProjectSettings.appearance.editorLineHeight
      );
      updateCodeBlockFontSizeVariable(
        newProjectSettings.code.codeBlockFontSize
      );
      updateFontFamilyVariable(
        '--app-font-family',
        newProjectSettings.appearance.uiFontFamily,
        DEFAULT_UI_FONT_FAMILY
      );
      updateFontFamilyVariable(
        '--code-block-font-family',
        newProjectSettings.code.codeBlockFontFamily,
        DEFAULT_CODE_BLOCK_FONT_FAMILY
      );
    },
    mutationFn: async ({
      newProjectSettings,
    }: {
      newProjectSettings: ProjectSettings;
    }) => {
      const res = await UpdateProjectSettings({
        ...newProjectSettings,
        pinnedNotes: [...newProjectSettings.pinnedNotes],
      });
      if (!res.success) throw new QueryError(res.message);
    },
  });
}
