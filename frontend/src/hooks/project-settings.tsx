import { useMutation } from '@tanstack/react-query';
import { Window } from '@wailsio/runtime';
import { useSetAtom } from 'jotai';
import { type Dispatch, type SetStateAction, useEffect } from 'react';
import { toast } from 'sonner';
import {
  GetProjectSettings,
  UpdateProjectSettings,
} from '../../bindings/github.com/etesam913/bytebook/services/settingsservice';
import { dialogDataAtom, projectSettingsAtom } from '../atoms';
import { SettingsDialog } from '../components/settings-dialog';
import { useWailsEvent } from '../hooks/events';
import type { ProjectSettings } from '../types';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import { validateProjectSettings } from '../utils/project-settings';
import { parseRGB } from '../utils/string-formatting';

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

async function getProjectSettings(
  setProjectSettings: Dispatch<SetStateAction<ProjectSettings>>
) {
  try {
    const { success, message, data } = await GetProjectSettings();
    if (!success || !data) throw new Error(message);

    const { darkMode, noteSidebarItemSize } = validateProjectSettings({
      darkMode: data.darkMode,
      noteSidebarItemSize: data.noteSidebarItemSize,
    });

    updateAccentColorVariable(data.accentColor);

    setProjectSettings({
      ...data,
      pinnedNotes: new Set(data.pinnedNotes),
      darkMode,
      noteSidebarItemSize,
      noteWidth: data.noteWidth as 'fullWidth' | 'readability',
    });
  } catch (err) {
    toast.error(
      err instanceof Error ? err.message : String(err),
      DEFAULT_SONNER_OPTIONS
    );
  }
}

export function useProjectSettings() {
  const setProjectSettings = useSetAtom(projectSettingsAtom);
  const setDialogData = useSetAtom(dialogDataAtom);

  useEffect(() => {
    getProjectSettings(setProjectSettings);
  }, []);

  useWailsEvent('settings:open', async (data) => {
    const windowName = await Window.Name();
    if (windowName !== data.sender) return;
    console.info('settings:open', data);
    setDialogData({
      isOpen: true,
      isPending: false,
      title: 'Settings',
      dialogClassName: 'w-[min(55rem,90vw)]',
      children: () => <SettingsDialog />,
      onSubmit: async () => {
        return new Promise((resolve) => {
          resolve(true);
        });
      },
    });
  });

  useWailsEvent('settings:update', (body) => {
    const projectSettings = (body.data as ProjectSettings[])[0];
    updateAccentColorVariable(projectSettings.accentColor);
    setProjectSettings({
      ...projectSettings,
      pinnedNotes: new Set(projectSettings.pinnedNotes),
    });
  });
}

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
