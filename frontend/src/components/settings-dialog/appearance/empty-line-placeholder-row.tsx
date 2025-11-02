import { useAtomValue } from 'jotai/react';
import { isDarkModeOnAtom, projectSettingsAtom } from '../../../atoms';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { SettingsRow } from '../settings-row';
import { Checkbox } from '../../../components/indeterminate-checkbox';
import lightImagePlaceholder from '../../../assets/images/empty-line-placeholder-light.jpg';
import darkImagePlaceholder from '../../../assets/images/empty-line-placeholder-dark.jpg';
import { SettingImage } from '.';

export function EmptyLinePlaceholderRow() {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useAtomValue(projectSettingsAtom);
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);

  return (
    <SettingsRow
      title="Empty Line Placeholder"
      description="Show placeholder hint when typing on empty lines"
    >
      <div className="flex items-center gap-3 flex-col">
        <SettingImage
          isActive={projectSettings.appearance.showEmptyLinePlaceholder ?? true}
          onClick={() => {
            updateProjectSettings({
              newProjectSettings: {
                ...projectSettings,
                appearance: {
                  ...projectSettings.appearance,
                  showEmptyLinePlaceholder: !(
                    projectSettings.appearance.showEmptyLinePlaceholder ?? true
                  ),
                },
              },
            });
          }}
          label="Preview"
          imgSrc={isDarkModeOn ? darkImagePlaceholder : lightImagePlaceholder}
          imgAlt="Empty line placeholder preview"
        />
        <div className="flex items-center gap-1.5">
          <Checkbox
            className="h-4 w-4"
            checked={
              projectSettings.appearance.showEmptyLinePlaceholder ?? true
            }
            id="empty-line-placeholder-checkbox"
            onChange={() => {
              updateProjectSettings({
                newProjectSettings: {
                  ...projectSettings,
                  appearance: {
                    ...projectSettings.appearance,
                    showEmptyLinePlaceholder: !(
                      projectSettings.appearance.showEmptyLinePlaceholder ??
                      true
                    ),
                  },
                },
              });
            }}
            aria-label="Show empty line placeholder"
          />
          <label
            className="text-sm text-zinc-500 dark:text-zinc-400"
            htmlFor="empty-line-placeholder-checkbox"
          >
            Show empty line placeholder
          </label>
        </div>
      </div>
    </SettingsRow>
  );
}
