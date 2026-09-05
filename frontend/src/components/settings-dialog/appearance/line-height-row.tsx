import { useAtomValue } from 'jotai/react';
import { ArrowRotateAnticlockwise } from '@/icons/arrow-rotate-anticlockwise';
import { projectSettingsAtom } from '@/atoms';
import { getDefaultButtonVariants } from '@/animations';
import { useUpdateProjectSettingsMutation } from '@hooks/project-settings';
import {
  DEFAULT_EDITOR_LINE_HEIGHT,
  EDITOR_LINE_HEIGHT_STEP,
  MAX_EDITOR_LINE_HEIGHT,
  MIN_EDITOR_LINE_HEIGHT,
  validateEditorLineHeight,
} from '@utils/project-settings';
import { MotionIconButton } from '@components/buttons';
import { AppNumberField } from '@components/input';
import { Tooltip } from '@components/tooltip';
import { SettingsRow } from '../settings-row';

export function LineHeightRow() {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useAtomValue(projectSettingsAtom);

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
        <AppNumberField
          aria-label="Editor line height"
          value={projectSettings.appearance.editorLineHeight}
          minValue={MIN_EDITOR_LINE_HEIGHT}
          maxValue={MAX_EDITOR_LINE_HEIGHT}
          step={EDITOR_LINE_HEIGHT_STEP}
          formatOptions={{ maximumFractionDigits: 1 }}
          onChange={(nextLineHeight) => {
            if (
              Number.isFinite(nextLineHeight) &&
              nextLineHeight !== projectSettings.appearance.editorLineHeight
            ) {
              updateLineHeight(nextLineHeight);
            }
          }}
          inputClassName="bg-zinc-150 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 w-20 h-8 text-sm my-auto"
        />
        <Tooltip
          content={
            projectSettings.appearance.editorLineHeight ===
            DEFAULT_EDITOR_LINE_HEIGHT
              ? 'Already set to default'
              : 'Reset to default'
          }
          showWhenDisabled={
            projectSettings.appearance.editorLineHeight ===
            DEFAULT_EDITOR_LINE_HEIGHT
          }
        >
          <MotionIconButton
            {...getDefaultButtonVariants()}
            aria-label="Reset editor line height"
            isDisabled={
              projectSettings.appearance.editorLineHeight ===
              DEFAULT_EDITOR_LINE_HEIGHT
            }
            onPress={() => updateLineHeight(DEFAULT_EDITOR_LINE_HEIGHT)}
          >
            <ArrowRotateAnticlockwise width="0.75rem" height="0.75rem" />
          </MotionIconButton>
        </Tooltip>
      </div>
    </SettingsRow>
  );
}
