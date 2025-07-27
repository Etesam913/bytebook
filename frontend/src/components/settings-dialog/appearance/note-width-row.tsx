import { useAtomValue } from 'jotai';
import { SettingImage } from '.';
import { isDarkModeOnAtom, projectSettingsAtom } from '../../../atoms';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { SettingsRow } from '../settings-row';
import fullWidthDark from '../../../assets/images/full-width-dark.webp';
import fullWidthLight from '../../../assets/images/full-width-light.webp';
import readabilityWidthDark from '../../../assets/images/readability-width-dark.webp';
import readabilityWidthLight from '../../../assets/images/readability-width-light.webp';

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
          imgSrc={isDarkModeOn ? fullWidthDark : fullWidthLight}
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
          imgSrc={isDarkModeOn ? readabilityWidthDark : readabilityWidthLight}
          label="Readability Width"
        />
      </div>
    </SettingsRow>
  );
}
