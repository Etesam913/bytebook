import {
  useProjectSettingsQuery,
  useUpdateProjectSettingsMutation,
} from '@hooks/project-settings';
import { useAtomValue } from 'jotai/react';
import { isDarkModeOnAtom } from '@/atoms';
import { cn } from '@utils/string-formatting';
import { SettingsRow } from '../settings-row';
import { AppCheckbox } from '@components/checkbox';
import { settingImageClasses } from '@components/settings-dialog/appearance';
import lightImagePlaceholder from '@/assets/images/empty-line-placeholder-light.jpg';
import darkImagePlaceholder from '@/assets/images/empty-line-placeholder-dark.jpg';

export function EmptyLinePlaceholderRow() {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useProjectSettingsQuery().data;
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const isEnabled = projectSettings.appearance.showEmptyLinePlaceholder ?? true;

  return (
    <SettingsRow
      title="Empty Line Placeholder"
      description="Show placeholder hint when typing on empty lines"
    >
      <AppCheckbox
        isSelected={isEnabled}
        onChange={(showEmptyLinePlaceholder) => {
          updateProjectSettings({
            newProjectSettings: {
              ...projectSettings,
              appearance: {
                ...projectSettings.appearance,
                showEmptyLinePlaceholder,
              },
            },
          });
        }}
        className="flex-col gap-3 text-zinc-500 dark:text-zinc-400"
      >
        {({ isSelected, box }) => (
          <>
            <img
              draggable="false"
              className={cn(
                settingImageClasses,
                isSelected && 'border-(--accent-color)!'
              )}
              src={isDarkModeOn ? darkImagePlaceholder : lightImagePlaceholder}
              alt="Empty line placeholder preview"
            />
            <span className="flex items-center gap-1.5">
              {box}
              Show empty line placeholder
            </span>
          </>
        )}
      </AppCheckbox>
    </SettingsRow>
  );
}
