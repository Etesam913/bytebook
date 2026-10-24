import {
  useProjectSettingsQuery,
  useUpdateProjectSettingsMutation,
} from '@hooks/project-settings';
import { AppSwitch } from '@components/switch';
import { SettingsRow } from '../settings-row';

export function TableOfContentsRow() {
  const projectSettings = useProjectSettingsQuery().data;
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();

  return (
    <SettingsRow
      title="Show Table of Contents"
      description="Show the table of contents by default in notes that don't specify it."
    >
      <div className="flex items-center gap-1.5">
        <AppSwitch
          isSelected={projectSettings.appearance.showTableOfContentsByDefault}
          onChange={(isSelected: boolean) => {
            updateProjectSettings({
              newProjectSettings: {
                ...projectSettings,
                appearance: {
                  ...projectSettings.appearance,
                  showTableOfContentsByDefault: isSelected,
                },
              },
            });
          }}
          aria-label="Show the table of contents by default"
        />
      </div>
    </SettingsRow>
  );
}
