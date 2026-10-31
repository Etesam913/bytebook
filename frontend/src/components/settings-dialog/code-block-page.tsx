import {
  useProjectSettingsQuery,
  useUpdateProjectSettingsMutation,
} from '@hooks/project-settings';
import { AppSwitch } from '@components/switch';
import { SettingsRow } from './settings-row';
import { FontFamilyRow } from './appearance/font-family-row';
import { FontSizeRow } from './appearance/font-size-row';
import { DefaultLanguageRow } from './default-language-row';

export function CodeBlockPage() {
  const projectSettings = useProjectSettingsQuery().data;
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();

  return (
    <>
      <FontFamilyRow setting="code-block" isFirst />
      <FontSizeRow setting="code-block" />
      <SettingsRow
        title="Vim Mode"
        description="Enable Vim Mode in code blocks"
      >
        <div className="flex items-center gap-1.5">
          <AppSwitch
            isSelected={projectSettings.code.codeBlockVimMode}
            onChange={(isSelected: boolean) => {
              updateProjectSettings({
                newProjectSettings: {
                  ...projectSettings,
                  code: {
                    ...projectSettings.code,
                    codeBlockVimMode: isSelected,
                  },
                },
              });
            }}
            aria-label="Enable Vim Mode in code blocks"
          />
        </div>
      </SettingsRow>
      <SettingsRow
        title="Line Wrapping"
        description="Wrap long lines in code blocks instead of scrolling horizontally"
      >
        <div className="flex items-center gap-1.5">
          <AppSwitch
            isSelected={projectSettings.code.codeBlockLineWrapping}
            onChange={(isSelected: boolean) => {
              updateProjectSettings({
                newProjectSettings: {
                  ...projectSettings,
                  code: {
                    ...projectSettings.code,
                    codeBlockLineWrapping: isSelected,
                  },
                },
              });
            }}
            aria-label="Enable line wrapping in code blocks"
          />
        </div>
      </SettingsRow>
      <SettingsRow
        title="Line Numbers"
        description="Show line numbers in code blocks"
      >
        <div className="flex items-center gap-1.5">
          <AppSwitch
            isSelected={projectSettings.code.codeBlockShowLineNumbers}
            onChange={(isSelected: boolean) => {
              updateProjectSettings({
                newProjectSettings: {
                  ...projectSettings,
                  code: {
                    ...projectSettings.code,
                    codeBlockShowLineNumbers: isSelected,
                  },
                },
              });
            }}
            aria-label="Show line numbers in code blocks"
          />
        </div>
      </SettingsRow>
      <DefaultLanguageRow />
    </>
  );
}
