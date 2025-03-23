import { Toggle } from '../toggle';
import { SettingsRow } from './settings-row';
import { useAtomValue } from 'jotai';
import { projectSettingsAtom } from '../../atoms';
import { useUpdateProjectSettingsMutation } from '../../hooks/project-settings';

export function CodeBlockPage() {
  const projectSettings = useAtomValue(projectSettingsAtom);
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();

  return (
    <>
      <SettingsRow
        title="Vim Mode"
        description="Enable Vim Mode in code blocks"
      >
        <div className="flex items-center gap-1.5">
          <Toggle
            checked={projectSettings.codeBlockVimMode}
            onChange={() => {
              updateProjectSettings({
                newProjectSettings: {
                  ...projectSettings,
                  codeBlockVimMode: !projectSettings.codeBlockVimMode,
                },
              });
            }}
          />
        </div>
      </SettingsRow>
    </>
  );
}
