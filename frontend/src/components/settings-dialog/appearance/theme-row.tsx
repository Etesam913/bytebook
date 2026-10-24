import {
  useProjectSettingsQuery,
  useUpdateProjectSettingsMutation,
} from '@hooks/project-settings';
import {
  SettingImage,
  SettingImageGroup,
} from '@components/settings-dialog/appearance';
import { SettingsRow } from '../settings-row';
import lightMode from '@/assets/images/light-mode.avif';
import darkMode from '@/assets/images/dark-mode.avif';
import lightAndDarkMode from '@/assets/images/light-and-dark-mode.avif';

const THEMES = [
  { value: 'light', label: 'Light', imgSrc: lightMode, imgAlt: 'light mode' },
  { value: 'dark', label: 'Dark', imgSrc: darkMode, imgAlt: 'dark mode' },
  {
    value: 'system',
    label: 'System',
    imgSrc: lightAndDarkMode,
    imgAlt: 'light and dark mode',
  },
] as const;

export function ThemeRow({ isFirst = false }: { isFirst?: boolean }) {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useProjectSettingsQuery().data;

  return (
    <SettingsRow
      title="Theme"
      description="Customize your UI theme"
      isFirst={isFirst}
    >
      <SettingImageGroup
        aria-label="Theme"
        value={projectSettings.appearance.theme}
        onChange={(theme) => {
          updateProjectSettings({
            newProjectSettings: {
              ...projectSettings,
              appearance: {
                ...projectSettings.appearance,
                theme: theme as typeof projectSettings.appearance.theme,
              },
            },
          });
        }}
      >
        {THEMES.map((theme) => (
          <SettingImage key={theme.value} {...theme} />
        ))}
      </SettingImageGroup>
    </SettingsRow>
  );
}
