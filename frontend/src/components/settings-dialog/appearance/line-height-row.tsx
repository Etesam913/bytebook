import { useRef } from 'react';
import { useAtomValue } from 'jotai/react';
import { TextField, Input } from 'react-aria-components/TextField';
import { ArrowRotateAnticlockwise } from '../../../icons/arrow-rotate-anticlockwise';
import { projectSettingsAtom } from '../../../atoms';
import { getDefaultButtonVariants } from '../../../animations';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import {
  DEFAULT_EDITOR_LINE_HEIGHT,
  EDITOR_LINE_HEIGHT_STEP,
  MAX_EDITOR_LINE_HEIGHT,
  MIN_EDITOR_LINE_HEIGHT,
  validateEditorLineHeight,
} from '../../../utils/project-settings';
import { MotionIconButton } from '../../buttons';
import { SettingsRow } from '../settings-row';

export function LineHeightRow() {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useAtomValue(projectSettingsAtom);
  const lineHeightInputRef = useRef<HTMLInputElement>(null);

  function updateLineHeight(nextLineHeight: number) {
    const validatedLineHeight = validateEditorLineHeight(nextLineHeight);
    updateProjectSettings({
      newProjectSettings: {
        ...projectSettings,
        appearance: {
          ...projectSettings.appearance,
          editorLineHeight: validatedLineHeight,
        },
      },
    });
  }

  return (
    <SettingsRow
      title="Editor Line Height"
      description="Controls the line height as a multiple of the font size."
    >
      <div className="flex items-center gap-1.5">
        <TextField
          key={projectSettings.appearance.editorLineHeight}
          aria-label="Editor line height"
          defaultValue={String(projectSettings.appearance.editorLineHeight)}
        >
          <Input
            ref={lineHeightInputRef}
            type="number"
            min={MIN_EDITOR_LINE_HEIGHT}
            max={MAX_EDITOR_LINE_HEIGHT}
            step={EDITOR_LINE_HEIGHT_STEP}
            className="bg-zinc-150 dark:bg-zinc-700 py-1 px-2 rounded-md border-2 border-zinc-300 dark:border-zinc-600 w-20 h-8 text-sm my-auto"
            onBlur={() => {
              const currentValue = lineHeightInputRef.current?.valueAsNumber;
              if (!Number.isFinite(currentValue)) {
                if (lineHeightInputRef.current) {
                  lineHeightInputRef.current.value = String(
                    projectSettings.appearance.editorLineHeight
                  );
                }
                return;
              }
              const clamped = validateEditorLineHeight(
                currentValue ?? DEFAULT_EDITOR_LINE_HEIGHT
              );
              if (lineHeightInputRef.current) {
                lineHeightInputRef.current.value = String(clamped);
              }
              if (clamped !== projectSettings.appearance.editorLineHeight) {
                updateLineHeight(clamped);
              }
            }}
          />
        </TextField>
        <MotionIconButton
          {...getDefaultButtonVariants()}
          isDisabled={
            projectSettings.appearance.editorLineHeight ===
            DEFAULT_EDITOR_LINE_HEIGHT
          }
          onClick={() => updateLineHeight(DEFAULT_EDITOR_LINE_HEIGHT)}
        >
          <ArrowRotateAnticlockwise width="0.75rem" height="0.75rem" />
        </MotionIconButton>
      </div>
    </SettingsRow>
  );
}
