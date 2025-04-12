import { useAtomValue } from 'jotai';
import { SettingImage } from '.';
import { isDarkModeOnAtom, projectSettingsAtom } from '../../../atoms';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { SettingsRow } from '../settings-row';

export function NoteWidthRow() {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useAtomValue(projectSettingsAtom);
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);

  return (
    <SettingsRow title="Note Width" description="Change the width of the note">
      <div className="flex gap-3">
        <SettingImage
          isActive={projectSettings.appearance.noteWidth === 'fullWidth'}
          onClick={() => {
            updateProjectSettings({
              newProjectSettings: {
                ...projectSettings,
                appearance: {
                  ...projectSettings.appearance,
                  noteWidth: 'fullWidth',
                },
              },
            });
          }}
          imgAlt="Full Width Option"
          imgSrc={
            isDarkModeOn
              ? 'https://bytebook.nyc3.cdn.digitaloceanspaces.com/color-scheme/full-width-dark.webp'
              : 'https://bytebook.nyc3.cdn.digitaloceanspaces.com/color-scheme/full-width-light.webp'
          }
          label="Full Width"
        />
        <SettingImage
          isActive={projectSettings.appearance.noteWidth === 'readability'}
          onClick={() => {
            updateProjectSettings({
              newProjectSettings: {
                ...projectSettings,
                appearance: {
                  ...projectSettings.appearance,
                  noteWidth: 'readability',
                },
              },
            });
          }}
          imgAlt="Readability Width Option"
          imgSrc={
            isDarkModeOn
              ? 'https://bytebook.nyc3.cdn.digitaloceanspaces.com/color-scheme/readability-width-dark.webp'
              : 'https://bytebook.nyc3.cdn.digitaloceanspaces.com/color-scheme/readability-width-light.webp'
          }
          label="Readability Width"
        />
      </div>
    </SettingsRow>
  );
}
