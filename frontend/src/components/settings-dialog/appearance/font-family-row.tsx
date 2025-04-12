import { useState } from 'react';
import { RefreshAnticlockwise } from '../../../icons/refresh-anticlockwise';
import { MotionIconButton } from '../../buttons';
import { Input } from '../../input';
import { SettingsRow } from '../settings-row';
import { getDefaultButtonVariants } from '../../../animations';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { useAtomValue } from 'jotai/react';
import { projectSettingsAtom } from '../../../atoms';

export function FontFamilyRow() {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useAtomValue(projectSettingsAtom);
  const [fontFamilyInputValue, setFontFamilyInputValue] = useState(
    projectSettings.appearance.editorFontFamily
  );

  return (
    <SettingsRow
      title="Editor Font Family"
      description="The font family for the note editor."
    >
      <div className="flex items-center gap-1.5">
        <Input
          labelProps={{}}
          inputProps={{
            type: 'text',
            className: 'w-56 h-8 text-sm my-auto',
            style: { fontFamily: fontFamilyInputValue },
            placeholder: 'Arial',
            value: fontFamilyInputValue,
            onChange: (e) => {
              setFontFamilyInputValue(e.target.value);
              updateProjectSettings({
                newProjectSettings: {
                  ...projectSettings,
                  appearance: {
                    ...projectSettings.appearance,
                    editorFontFamily: e.target.value,
                  },
                },
              });
            },
          }}
        />
        <MotionIconButton
          {...getDefaultButtonVariants()}
          disabled={fontFamilyInputValue.trim().length === 0}
          onClick={() => {
            setFontFamilyInputValue('Bricolage Grotesque');
            updateProjectSettings({
              newProjectSettings: {
                ...projectSettings,
                appearance: {
                  ...projectSettings.appearance,
                  editorFontFamily: 'Bricolage Grotesque',
                },
              },
            });
          }}
        >
          <RefreshAnticlockwise width={12} height={12} />
        </MotionIconButton>
      </div>
    </SettingsRow>
  );
}
