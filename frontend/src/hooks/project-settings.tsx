import { useMutation, useQuery } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { logger } from '@utils/logging';
import { useEffect } from 'react';
import {
  GetProjectSettings,
  UpdateProjectSettings,
} from '@bindings/services/settingsservice';
import { projectSettingsAtom, projectSettingsLoadedAtom } from '@/atoms';
import { useOpenSettingsDialog } from '@hooks/dialogs';
import { useWailsEvent } from '@hooks/events';
import type { ProjectSettings } from '@/types';
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_CODE_BLOCK_FONT_FAMILY,
  DEFAULT_UI_FONT_FAMILY,
  normalizeProjectSettings,
  validateCodeBlockFontSize,
  validateEditorFontSize,
  validateEditorLineHeight,
} from '@utils/project-settings';
import {
  isEventInCurrentWindow,
  SETTINGS_OPEN,
  SETTINGS_UPDATE,
} from '@utils/events';
import { parseRGB } from '@utils/string-formatting';
import {
  getBackendResponseData,
  requireBackendResponseData,
} from '@utils/query';
import { queryKeys } from '@utils/query-keys';
import { ProjectSettingsJson } from '@bindings/config/models';

const APPEARANCE_VARIABLES = [
  '--accent-color-values',
  '--editor-font-size-base',
  '--editor-line-height',
  '--code-block-font-size-base',
  '--app-font-family',
  '--code-block-font-family',
] as const;

function fontFamilyOrDefault(fontFamily: string, defaultFontFamily: string) {
  return fontFamily.trim().length > 0 ? fontFamily : defaultFontFamily;
}

// The only place appearance settings are written to CSS variables.
function applyAppearanceVariables({
  appearance,
  code,
}: Pick<ProjectSettings, 'appearance' | 'code'>) {
  const style = document.documentElement.style;
  const accent =
    parseRGB(appearance.accentColor) ?? parseRGB(DEFAULT_ACCENT_COLOR);
  if (accent) {
    style.setProperty(
      '--accent-color-values',
      `${accent.r},${accent.g},${accent.b}`
    );
  }
  style.setProperty(
    '--editor-font-size-base',
    `${validateEditorFontSize(appearance.editorFontSize)}px`
  );
  style.setProperty(
    '--editor-line-height',
    String(validateEditorLineHeight(appearance.editorLineHeight))
  );
  style.setProperty(
    '--code-block-font-size-base',
    `${validateCodeBlockFontSize(code.codeBlockFontSize)}px`
  );
  style.setProperty(
    '--app-font-family',
    fontFamilyOrDefault(appearance.uiFontFamily, DEFAULT_UI_FONT_FAMILY)
  );
  style.setProperty(
    '--code-block-font-family',
    fontFamilyOrDefault(
      code.codeBlockFontFamily,
      DEFAULT_CODE_BLOCK_FONT_FAMILY
    )
  );
}

// Snapshots inline values so a failed update can restore them; an empty string removes the property.
function captureAppearanceVariables() {
  const style = document.documentElement.style;
  return APPEARANCE_VARIABLES.map(
    (name) => [name, style.getPropertyValue(name)] as const
  );
}

function restoreAppearanceVariables(
  snapshot: ReturnType<typeof captureAppearanceVariables>
) {
  const style = document.documentElement.style;
  for (const [name, value] of snapshot) {
    style.setProperty(name, value);
  }
}

// Normalizes backend data and applies its appearance to the document.
function applyProjectSettings(data: ProjectSettingsJson) {
  const settings = normalizeProjectSettings(data);
  applyAppearanceVariables(settings);
  return settings;
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
  const openSettings = useOpenSettingsDialog();

  const { data: settings } = useQuery({
    queryKey: queryKeys.projectSettings(),
    queryFn: async () => {
      return applyProjectSettings(
        await requireBackendResponseData(GetProjectSettings())
      );
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
      openSettings();
    })();
  });

  // Re-run the mutation when a 'settings:update' event is received.
  useWailsEvent(SETTINGS_UPDATE, (body) => {
    setProjectSettings(applyProjectSettings(body.data));
    setProjectSettingsLoaded(true);
  });
}

/**
 * Custom hook to create a mutation for updating project settings.
 *
 * Appearance variables are applied optimistically and restored if the backend
 * update fails. On success, the backend's 'settings:update' event re-applies
 * the authoritative values.
 *
 * @returns  Te mutation object from useMutation.
 */
export function useUpdateProjectSettingsMutation() {
  return useMutation({
    onMutate: ({ newProjectSettings }) => {
      const previousVariables = captureAppearanceVariables();
      applyAppearanceVariables(newProjectSettings);
      return { previousVariables };
    },
    onError: (_error, _variables, context) => {
      if (context) restoreAppearanceVariables(context.previousVariables);
    },
    mutationFn: async ({
      newProjectSettings,
    }: {
      newProjectSettings: ProjectSettings;
    }) => {
      await getBackendResponseData(
        UpdateProjectSettings({
          ...newProjectSettings,
          pinnedNotes: [...newProjectSettings.pinnedNotes],
        })
      );
    },
  });
}
