import { useRef } from 'react';
import { useAtomValue } from 'jotai/react';
import { ArrowRotateAnticlockwise } from '../../../icons/arrow-rotate-anticlockwise';
import { projectSettingsAtom } from '../../../atoms';
import { getDefaultButtonVariants } from '../../../animations';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import {
  DEFAULT_EDITOR_FONT_SIZE,
  MAX_EDITOR_FONT_SIZE,
  MIN_EDITOR_FONT_SIZE,
  validateEditorFontSize,
} from '../../../utils/project-settings';
import { MotionIconButton } from '../../buttons';
import { Input } from '../../input';
import { SettingsRow } from '../settings-row';

export function FontSizeRow() {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useAtomValue(projectSettingsAtom);
  const fontSizeInputRef = useRef<HTMLInputElement>(null);

  function updateFontSize(nextFontSize: number) {
    const validatedFontSize = validateEditorFontSize(nextFontSize);
    updateProjectSettings({
      newProjectSettings: {
        ...projectSettings,
        appearance: {
          ...projectSettings.appearance,
          editorFontSize: validatedFontSize,
        },
      },
    });
  }

  return (
    <SettingsRow
      title="Default Editor Font Size"
      description="Controls the font size in pixels."
      isFirst={true}
    >
      <div className="flex items-center gap-1.5">
        <Input
          key={projectSettings.appearance.editorFontSize}
          ref={fontSizeInputRef}
          labelProps={{}}
          inputProps={{
            type: 'number',
            min: MIN_EDITOR_FONT_SIZE,
            max: MAX_EDITOR_FONT_SIZE,
            step: 1,
            className: 'w-20 h-8 text-sm my-auto',
            defaultValue: projectSettings.appearance.editorFontSize,
            onChange: (e) => {
              const nextFontSize = e.currentTarget.valueAsNumber;
              if (!Number.isFinite(nextFontSize)) {
                return;
              }
              const roundedFontSize = Math.round(nextFontSize);
              if (
                roundedFontSize < MIN_EDITOR_FONT_SIZE ||
                roundedFontSize > MAX_EDITOR_FONT_SIZE
              ) {
                return;
              }
              updateFontSize(roundedFontSize);
            },
            onBlur: () => {
              const currentValue = fontSizeInputRef.current?.valueAsNumber;
              if (!Number.isFinite(currentValue)) {
                if (fontSizeInputRef.current) {
                  fontSizeInputRef.current.value = String(
                    projectSettings.appearance.editorFontSize
                  );
                }
                return;
              }
              const clamped = validateEditorFontSize(
                Math.round(currentValue ?? DEFAULT_EDITOR_FONT_SIZE)
              );
              if (fontSizeInputRef.current) {
                fontSizeInputRef.current.value = String(clamped);
              }
              if (
                clamped !== Math.round(currentValue ?? DEFAULT_EDITOR_FONT_SIZE)
              ) {
                updateFontSize(clamped);
              }
            },
          }}
        />
        <MotionIconButton
          {...getDefaultButtonVariants()}
          isDisabled={
            projectSettings.appearance.editorFontSize ===
            DEFAULT_EDITOR_FONT_SIZE
          }
          onClick={() => updateFontSize(DEFAULT_EDITOR_FONT_SIZE)}
        >
          <ArrowRotateAnticlockwise width="0.75rem" height="0.75rem" />
        </MotionIconButton>
      </div>
    </SettingsRow>
  );
}
