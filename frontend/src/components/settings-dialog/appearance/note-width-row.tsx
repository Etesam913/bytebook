import { useAtomValue } from 'jotai';
import {
  SettingImage,
  SettingImageGroup,
} from '@components/settings-dialog/appearance';
import { isDarkModeOnAtom, projectSettingsAtom } from '@/atoms';
import { useUpdateProjectSettingsMutation } from '@hooks/project-settings';
import { SettingsRow } from '../settings-row';
import fullWidthDark from '@/assets/images/full-width-dark.avif';
import fullWidthLight from '@/assets/images/full-width-light.avif';
import readabilityWidthDark from '@/assets/images/readability-width-dark.avif';
import readabilityWidthLight from '@/assets/images/readability-width-light.avif';

export function NoteWidthRow() {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useAtomValue(projectSettingsAtom);
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);

  return (
    <SettingsRow title="Note Width" description="Change the width of the note">
      <SettingImageGroup
        aria-label="Note width"
        value={projectSettings.appearance.noteWidth}
        onChange={(noteWidth) => {
          updateProjectSettings({
            newProjectSettings: {
              ...projectSettings,
              appearance: {
                ...projectSettings.appearance,
                noteWidth:
                  noteWidth as typeof projectSettings.appearance.noteWidth,
              },
            },
          });
        }}
      >
        <SettingImage
          value="fullWidth"
          imgAlt="Full Width Option"
          imgSrc={isDarkModeOn ? fullWidthDark : fullWidthLight}
          label="Full Width"
        />
        <SettingImage
          value="readability"
          imgAlt="Readability Width Option"
          imgSrc={isDarkModeOn ? readabilityWidthDark : readabilityWidthLight}
          label="Readability Width"
        />
      </SettingImageGroup>
    </SettingsRow>
  );
}
