import { useMutation } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { toast } from 'sonner';
import {
  GetProjectSettings,
  UpdateProjectSettings,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/settingsservice';
import { dialogDataAtom, projectSettingsAtom } from '../atoms';
import { SettingsDialog } from '../components/settings-dialog';
import { useWailsEvent } from '../hooks/events';
import type { ProjectSettings } from '../types';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import { validateProjectSettings } from '../utils/project-settings';
import { isEventInCurrentWindow } from '../utils/events';
import { parseRGB } from '../utils/string-formatting';
import { QueryError } from '../utils/query';
import { ProjectSettingsJson } from '../../bindings/github.com/etesam913/bytebook/internal/config/models';

function updateAccentColorVariable(accentColor: string) {
  let rgbValues = parseRGB(accentColor);
  if (!rgbValues) {
    rgbValues = {
      r: 96,
      g: 165,
      b: 250,
    };
  }

  document.documentElement.style.setProperty(
    '--accent-color-values',
    `${rgbValues.r},${rgbValues.g},${rgbValues.b}`
  );
}
/**
 * Validates project settings from the server.
 *
 * @returns  The validated project settings.
 * @throws  If the fetch operation fails or returns invalid data.
 */
function validateProjectSettingsWrapper(data: ProjectSettingsJson) {
  const { theme, noteSidebarItemSize, noteWidth } = validateProjectSettings({
    theme: data.appearance.theme,
    noteSidebarItemSize: data.appearance.noteSidebarItemSize,
    noteWidth: data.appearance.noteWidth,
  });

  updateAccentColorVariable(data.appearance.accentColor);

  return {
    ...data,
    pinnedNotes: new Set(data.pinnedNotes),
    appearance: {
      ...data.appearance,
      accentColor: data.appearance.accentColor,
      theme,
      noteSidebarItemSize,
      noteWidth,
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
  const setDialogData = useSetAtom(dialogDataAtom);

  // Create a mutation using react-query's useMutation hook.
  const { mutate: fetchAndValidateProjectSettings } = useMutation({
    mutationFn: async () => {
      const { success, message, data } = await GetProjectSettings();
      if (!success || !data) {
        throw new QueryError(message);
      }
      return validateProjectSettingsWrapper(data);
    },
    onSuccess: (updatedSettings) => {
      setProjectSettings(updatedSettings);
    },
  });

  // Run the mutation on component initialization.
  useEffect(() => {
    fetchAndValidateProjectSettings();
  }, []);

  // Open the settings dialog on 'settings:open' event.
  useWailsEvent('settings:open', async (data) => {
    if (!(await isEventInCurrentWindow(data))) return;
    console.info('settings:open', data);
    setDialogData({
      isOpen: true,
      isPending: false,
      title: 'Settings',
      dialogClassName: 'w-[min(55rem,90vw)]',
      children: () => <SettingsDialog />,
      onSubmit: async () => Promise.resolve(true),
    });
  });

  // Re-run the mutation when a 'settings:update' event is received.
  useWailsEvent('settings:update', (body) => {
    const projectSettings = body.data as ProjectSettingsJson;
    setProjectSettings(validateProjectSettingsWrapper(projectSettings));
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
    mutationFn: async ({
      newProjectSettings,
    }: {
      newProjectSettings: ProjectSettings;
    }) => {
      const res = await UpdateProjectSettings({
        ...newProjectSettings,
        pinnedNotes: [...newProjectSettings.pinnedNotes],
      });
      if (!res.success) throw new Error(res.message);
    },
    onError: (e) => {
      if (e instanceof Error) {
        toast.error(e.message, DEFAULT_SONNER_OPTIONS);
      } else {
        toast.error(
          'An Unknown Error Occurred. Please Try Again Later',
          DEFAULT_SONNER_OPTIONS
        );
      }
    },
  });
}
