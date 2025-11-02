import { useAtomValue } from 'jotai/react';
import { projectSettingsAtom } from '../../../atoms';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { cn } from '../../../utils/string-formatting';
import { SettingsRow } from '../settings-row';
import lightMode from '../../../assets/images/light-mode.jpg';
import darkMode from '../../../assets/images/dark-mode.jpg';
import lightAndDarkMode from '../../../assets/images/light-and-dark-mode.jpg';

function ThemeButton({
  label,
  imgSrc,
  imgAlt,
  onClick,
  isActive,
}: {
  label: string;
  imgSrc: string;
  imgAlt: string;
  onClick: () => void;
  isActive: boolean;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label}>
      <p
        className={cn(
          'text-sm text-zinc-500 dark:text-zinc-400',
          isActive && 'text-zinc-950 dark:text-zinc-100 '
        )}
      >
        {label}
      </p>
      <img
        draggable="false"
        className={cn(
          'border-[3px] rounded-md p-1 border-zinc-200 dark:border-zinc-750',
          isActive && 'border-(--accent-color)!'
        )}
        src={imgSrc}
        alt={imgAlt}
      />
    </button>
  );
}

export function ThemeRow() {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useAtomValue(projectSettingsAtom);

  return (
    <SettingsRow title="Theme" description="Customize your UI theme">
      <div className="flex gap-3">
        <ThemeButton
          label="Light"
          imgSrc={lightMode}
          imgAlt="light mode"
          onClick={() => {
            updateProjectSettings({
              newProjectSettings: {
                ...projectSettings,
                appearance: {
                  ...projectSettings.appearance,
                  theme: 'light',
                },
              },
            });
          }}
          isActive={projectSettings.appearance.theme === 'light'}
        />
        <ThemeButton
          label="Dark"
          imgSrc={darkMode}
          imgAlt="dark mode"
          onClick={() => {
            updateProjectSettings({
              newProjectSettings: {
                ...projectSettings,
                appearance: {
                  ...projectSettings.appearance,
                  theme: 'dark',
                },
              },
            });
          }}
          isActive={projectSettings.appearance.theme === 'dark'}
        />
        <ThemeButton
          label="System"
          imgSrc={lightAndDarkMode}
          imgAlt="light and dark mode"
          onClick={() => {
            updateProjectSettings({
              newProjectSettings: {
                ...projectSettings,
                appearance: {
                  ...projectSettings.appearance,
                  theme: 'system',
                },
              },
            });
          }}
          isActive={projectSettings.appearance.theme === 'system'}
        />
      </div>
    </SettingsRow>
  );
}
