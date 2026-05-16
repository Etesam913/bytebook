import { useState } from 'react';
import { TextField, Input } from 'react-aria-components/TextField';
import { ArrowRotateAnticlockwise } from '../../../icons/arrow-rotate-anticlockwise';
import { MotionIconButton } from '../../buttons';
import { SettingsRow } from '../settings-row';
import { getDefaultButtonVariants } from '../../../animations';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { useAtomValue } from 'jotai/react';
import { projectSettingsAtom } from '../../../atoms';

type FontFamilySetting = 'ui' | 'editor' | 'code-block';

const fontFamilyCopy: Record<
  FontFamilySetting,
  {
    title: string;
    description: string;
    ariaLabel: string;
    defaultValue: string;
  }
> = {
  ui: {
    title: 'UI Font Family',
    description: 'The font family for the app interface.',
    ariaLabel: 'UI font family',
    defaultValue: 'ui-sans-serif',
  },
  editor: {
    title: 'Editor Font Family',
    description: 'The font family for the note editor.',
    ariaLabel: 'Editor font family',
    defaultValue: '',
  },
  'code-block': {
    title: 'Code Block Font Family',
    description: 'The font family for code block editors and output.',
    ariaLabel: 'Code block font family',
    defaultValue: 'monospace',
  },
};

export function FontFamilyRow({
  setting,
  isFirst = false,
}: {
  setting: FontFamilySetting;
  isFirst?: boolean;
}) {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useAtomValue(projectSettingsAtom);
  const copy = fontFamilyCopy[setting];
  const currentFontFamily =
    setting === 'ui'
      ? projectSettings.appearance.uiFontFamily
      : setting === 'editor'
        ? projectSettings.appearance.editorFontFamily
        : projectSettings.code.codeBlockFontFamily;
  const [fontFamilyInputValue, setFontFamilyInputValue] = useState(
    currentFontFamily || copy.defaultValue
  );

  function updateFontFamily(value: string) {
    if (setting === 'code-block') {
      updateProjectSettings({
        newProjectSettings: {
          ...projectSettings,
          code: {
            ...projectSettings.code,
            codeBlockFontFamily: value,
          },
        },
      });
      return;
    }

    updateProjectSettings({
      newProjectSettings: {
        ...projectSettings,
        appearance: {
          ...projectSettings.appearance,
          ...(setting === 'ui'
            ? { uiFontFamily: value }
            : { editorFontFamily: value }),
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
        <TextField
          aria-label={copy.ariaLabel}
          value={fontFamilyInputValue}
          onChange={(value: string) => {
            setFontFamilyInputValue(value);
            updateFontFamily(value);
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
          isDisabled={fontFamilyInputValue === copy.defaultValue}
          onClick={() => {
            setFontFamilyInputValue(copy.defaultValue);
            updateFontFamily(copy.defaultValue);
          }}
        >
          <ArrowRotateAnticlockwise width="0.75rem" height="0.75rem" />
        </MotionIconButton>
      </div>
    </SettingsRow>
  );
}
