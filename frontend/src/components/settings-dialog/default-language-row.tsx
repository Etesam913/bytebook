import { useAtomValue } from 'jotai/react';
import { projectSettingsAtom } from '@/atoms';
import { useUpdateProjectSettingsMutation } from '@hooks/project-settings';
import { LANGUAGES, type DropdownItem } from '@/types';
import { LANGUAGE_DISPLAY_NAMES } from '@utils/code';
import { validateCodeBlockDefaultLanguage } from '@utils/project-settings';
import { languageDisplayConfig } from '@components/code/language-config';
import { Dropdown } from '@components/dropdown';
import { SettingsRow } from './settings-row';

const languageItems: DropdownItem[] = Object.values(LANGUAGES).map(
  (language) => ({
    value: language,
    label: (
      <span className="flex items-center gap-1.5">
        {languageDisplayConfig[language].icon}
        {LANGUAGE_DISPLAY_NAMES[language]}
      </span>
    ),
  })
);

export function DefaultLanguageRow() {
  const projectSettings = useAtomValue(projectSettingsAtom);
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();

  return (
    <SettingsRow
      title="Default Code Block Language"
      description='The language used by the generic "Code Block" option in the slash menu.'
    >
      <div className="flex items-center gap-1.5">
        <Dropdown
          items={languageItems}
          className="w-40"
          aria-label="Default code block language"
          controlledValueIndex={languageItems.findIndex(
            (item) =>
              item.value === projectSettings.code.codeBlockDefaultLanguage
          )}
          onChange={(item) => {
            updateProjectSettings({
              newProjectSettings: {
                ...projectSettings,
                code: {
                  ...projectSettings.code,
                  codeBlockDefaultLanguage: validateCodeBlockDefaultLanguage(
                    item.value
                  ),
                },
              },
            });
          }}
        />
      </div>
    </SettingsRow>
  );
}
