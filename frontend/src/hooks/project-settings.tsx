import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { queryKeys } from '@utils/query-keys';
import { logger } from '@utils/logging';
import { useEffect } from 'react';
import {
  GetProjectSettings,
  UpdateProjectSettings,
} from '@bindings/services/settingsservice';
import { useOpenSettingsDialog } from '@hooks/dialogs';
import { useWailsEvent, useCurrentWindowWailsEvent } from '@hooks/events';
import type { ProjectSettings } from '@/types';
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_CODE_BLOCK_FONT_FAMILY,
  DEFAULT_UI_FONT_FAMILY,
  normalizeProjectSettings,
  validateCodeBlockFontSize,
  validateEditorFontSize,
  validateEditorLineHeight,
} from '@utils/project-settings';
import { SETTINGS_OPEN, SETTINGS_UPDATE } from '@bindings/util/event-names';
import { parseRGB } from '@utils/string-formatting';
import { requireBackendResponseData } from '@utils/query';

const projectSettingsQueries = {
  settings: () =>
    queryOptions({
      queryKey: queryKeys.projectSettings(),
      queryFn: async () =>
        normalizeProjectSettings(
          await requireBackendResponseData(GetProjectSettings())
        ),
      staleTime: Infinity,
    }),
};

export function useProjectSettingsQuery() {
  const query = useQuery(projectSettingsQueries.settings());
  return { ...query, data: query.data ?? DEFAULT_PROJECT_SETTINGS };
}

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

// Mounted once by App; all appearance and event updates use the shared cache.
export function useProjectSettingsSync() {
  const queryClient = useQueryClient();
  const { data: settings, isSuccess } = useProjectSettingsQuery();
  const openSettings = useOpenSettingsDialog();

  useEffect(() => {
    if (isSuccess) applyAppearanceVariables(settings);
  }, [settings, isSuccess]);

  useCurrentWindowWailsEvent(SETTINGS_OPEN, (data) => {
    logger.event(SETTINGS_OPEN, data);
    openSettings();
  });

  useWailsEvent(SETTINGS_UPDATE, (body) => {
    // Prevent an older initial read from overwriting this event.
    void queryClient.cancelQueries({ queryKey: queryKeys.projectSettings() });
    queryClient.setQueryData(
      queryKeys.projectSettings(),
      normalizeProjectSettings(body.data)
    );
  });
}

// Preview through the same cache that readers observe, then use the persisted response.
export function useUpdateProjectSettingsMutation({
  inlineError = false,
}: { inlineError?: boolean } = {}) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.projectSettings();

  return useMutation({
    meta: { inlineError },
    onMutate: async ({ newProjectSettings }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousSettings =
        queryClient.getQueryData<ProjectSettings>(queryKey);
      queryClient.setQueryData(queryKey, newProjectSettings);
      const optimisticSettings =
        queryClient.getQueryData<ProjectSettings>(queryKey);
      return { previousSettings, optimisticSettings };
    },
    onError: (_error, _variables, context) => {
      // A later save or backend event takes precedence over this failed preview.
      if (
        context &&
        queryClient.getQueryData(queryKey) === context.optimisticSettings
      ) {
        if (context.previousSettings) {
          queryClient.setQueryData(queryKey, context.previousSettings);
        } else {
          void queryClient.resetQueries({ queryKey });
        }
      }
    },
    mutationFn: async ({
      newProjectSettings,
    }: {
      newProjectSettings: ProjectSettings;
    }) => {
      const saved = await requireBackendResponseData(
        UpdateProjectSettings({
          ...newProjectSettings,
          pinnedNotes: [...newProjectSettings.pinnedNotes],
        })
      );
      return normalizeProjectSettings(saved);
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKey, settings);
    },
  });
}
