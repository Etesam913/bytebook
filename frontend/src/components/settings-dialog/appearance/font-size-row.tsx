import {
  useProjectSettingsQuery,
  useUpdateProjectSettingsMutation,
} from '@hooks/project-settings';
import { ArrowRotateAnticlockwise } from '@/icons/arrow-rotate-anticlockwise';
import { getDefaultButtonVariants } from '@/animations';
import {
  DEFAULT_CODE_BLOCK_FONT_SIZE,
  DEFAULT_EDITOR_FONT_SIZE,
  MAX_CODE_BLOCK_FONT_SIZE,
  MAX_EDITOR_FONT_SIZE,
  MIN_CODE_BLOCK_FONT_SIZE,
  MIN_EDITOR_FONT_SIZE,
  validateCodeBlockFontSize,
  validateEditorFontSize,
} from '@utils/project-settings';
import { MotionIconButton } from '@components/buttons';
import { AppNumberField } from '@components/input';
import { Tooltip } from '@components/tooltip';
import { SettingsRow } from '../settings-row';

type FontSizeSetting = 'editor' | 'code-block';

const fontSizeCopy: Record<
  FontSizeSetting,
  {
    title: string;
    description: string;
    ariaLabel: string;
    defaultValue: number;
    minValue: number;
    maxValue: number;
    validate: (fontSize: unknown) => number;
  }
> = {
  editor: {
    title: 'Editor Default Font Size',
    description: 'Controls the font size in pixels.',
    ariaLabel: 'Editor font size',
    defaultValue: DEFAULT_EDITOR_FONT_SIZE,
    minValue: MIN_EDITOR_FONT_SIZE,
    maxValue: MAX_EDITOR_FONT_SIZE,
    validate: validateEditorFontSize,
  },
  'code-block': {
    title: 'Code Block Font Size',
    description: 'Controls the font size in pixels for code blocks.',
    ariaLabel: 'Code block font size',
    defaultValue: DEFAULT_CODE_BLOCK_FONT_SIZE,
    minValue: MIN_CODE_BLOCK_FONT_SIZE,
    maxValue: MAX_CODE_BLOCK_FONT_SIZE,
    validate: validateCodeBlockFontSize,
  },
};

export function FontSizeRow({
  setting,
  isFirst = false,
}: {
  setting: FontSizeSetting;
  isFirst?: boolean;
}) {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useProjectSettingsQuery().data;
  const copy = fontSizeCopy[setting];
  const currentFontSize =
    setting === 'editor'
      ? projectSettings.appearance.editorFontSize
      : projectSettings.code.codeBlockFontSize;

  function updateFontSize(nextFontSize: number) {
    const validatedFontSize = copy.validate(nextFontSize);
    if (setting === 'editor') {
      updateProjectSettings({
        newProjectSettings: {
          ...projectSettings,
          appearance: {
            ...projectSettings.appearance,
            editorFontSize: validatedFontSize,
          },
        },
      });
      return;
    }

    updateProjectSettings({
      newProjectSettings: {
        ...projectSettings,
        code: {
          ...projectSettings.code,
          codeBlockFontSize: validatedFontSize,
        },
      },
    });
  }

  return (
    <SettingsRow
      title={copy.title}
      description={copy.description}
      isFirst={isFirst}
    >
      <div className="flex items-center gap-1.5">
        <AppNumberField
          aria-label={copy.ariaLabel}
          value={currentFontSize}
          minValue={copy.minValue}
          maxValue={copy.maxValue}
          step={1}
          formatOptions={{ maximumFractionDigits: 0 }}
          onChange={(nextFontSize) => {
            if (
              Number.isFinite(nextFontSize) &&
              nextFontSize !== currentFontSize
            ) {
              updateFontSize(nextFontSize);
            }
          }}
          inputClassName="bg-zinc-150 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 w-20 h-8 text-sm my-auto"
        />
        <Tooltip
          content={
            currentFontSize === copy.defaultValue
              ? 'Already set to default'
              : 'Reset to default'
          }
          showWhenDisabled={currentFontSize === copy.defaultValue}
        >
          <MotionIconButton
            {...getDefaultButtonVariants()}
            aria-label="Reset font size"
            isDisabled={currentFontSize === copy.defaultValue}
            onPress={() => updateFontSize(copy.defaultValue)}
          >
            <ArrowRotateAnticlockwise width="0.75rem" height="0.75rem" />
          </MotionIconButton>
        </Tooltip>
      </div>
    </SettingsRow>
  );
}
