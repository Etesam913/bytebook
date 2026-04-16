import { useState } from 'react';
import { TextField, Input } from 'react-aria-components';
import { ArrowRotateAnticlockwise } from '../../../icons/arrow-rotate-anticlockwise';
import { MotionIconButton } from '../../buttons';
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
        <TextField
          aria-label="Editor font family"
          value={fontFamilyInputValue}
          onChange={(value: string) => {
            setFontFamilyInputValue(value);
            updateProjectSettings({
              newProjectSettings: {
                ...projectSettings,
                appearance: {
                  ...projectSettings.appearance,
                  editorFontFamily: value,
                },
              },
            });
          }}
        >
          <Input
            className="bg-zinc-150 dark:bg-zinc-700 py-1 px-2 rounded-md border-2 border-zinc-300 dark:border-zinc-600 w-56 h-8 text-sm my-auto"
            style={{ fontFamily: fontFamilyInputValue }}
            placeholder="Arial"
          />
        </TextField>
        <MotionIconButton
          {...getDefaultButtonVariants()}
          isDisabled={fontFamilyInputValue.trim().length === 0}
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
          <ArrowRotateAnticlockwise width="0.75rem" height="0.75rem" />
        </MotionIconButton>
      </div>
    </SettingsRow>
  );
}
