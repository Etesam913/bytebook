import { useState } from 'react';
import { ComboBox, Input } from 'react-aria-components/ComboBox';
import { Button } from 'react-aria-components/Button';
import { ListBox, ListBoxItem } from 'react-aria-components/ListBox';
import { ChevronDown } from '@/icons/chevron-down';
import { AppMenuPopover } from '@components/menu';
import { useFontFamiliesQuery } from '@hooks/fonts';
import { cn } from '@utils/string-formatting';
import { ArrowRotateAnticlockwise } from '@/icons/arrow-rotate-anticlockwise';
import { MotionIconButton } from '@components/buttons';
import { Tooltip } from '@components/tooltip';
import { SettingsRow } from '../settings-row';
import { getDefaultButtonVariants } from '@/animations';
import { useUpdateProjectSettingsMutation } from '@hooks/project-settings';
import { useAtomValue } from 'jotai/react';
import { projectSettingsAtom } from '@/atoms';

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
  const { data: fontFamilies = [], isPending } = useFontFamiliesQuery();
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

  const options = [
    { id: copy.defaultValue, name: 'Default' },
    ...[...new Set([fontFamilyInputValue, ...fontFamilies])]
      .filter((family) => family !== copy.defaultValue && family !== '')
      .map((family) => ({ id: family, name: family })),
  ];

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
        <ComboBox
          aria-label={copy.ariaLabel}
          defaultItems={options}
          selectedKey={fontFamilyInputValue}
          onSelectionChange={(key) => {
            if (key === null) return;
            const value = String(key);
            setFontFamilyInputValue(value);
            updateFontFamily(value);
          }}
          menuTrigger="focus"
          className="group/font-combobox w-56"
        >
          <div className="bg-zinc-150 dark:bg-zinc-700 flex items-center rounded-md border-2 border-zinc-300 dark:border-zinc-600 h-8 focus-within:border-(--accent-color)">
            <Input
              className="min-w-0 flex-1 bg-transparent py-1 pl-2 text-sm outline-hidden"
              placeholder={isPending ? 'Loading fonts…' : 'Search fonts…'}
            />
            <Button className="flex h-full items-center px-2 outline-hidden focus-visible:bg-zinc-200 dark:focus-visible:bg-zinc-600">
              <ChevronDown className="transition-transform duration-150 group-data-[open]/font-combobox:rotate-180" />
            </Button>
          </div>
          <AppMenuPopover className="w-(--trigger-width)" skipAnimation>
            <ListBox<{
              id: string;
              name: string;
            }>
              shouldFocusOnHover
              className="max-h-64 overflow-auto p-1 text-sm outline-hidden"
            >
              {(item) => (
                <ListBoxItem
                  id={item.id}
                  textValue={item.name}
                  style={{
                    fontFamily:
                      item.id === copy.defaultValue
                        ? copy.defaultValue || 'inherit'
                        : JSON.stringify(item.name),
                  }}
                  className={({ isFocused, isSelected }) =>
                    cn(
                      'cursor-default truncate rounded-lg px-2.5 py-1 outline-hidden',
                      isFocused && 'bg-(--accent-color) text-white',
                      !isFocused && isSelected && 'bg-zinc-150 dark:bg-zinc-600'
                    )
                  }
                >
                  {item.name}
                </ListBoxItem>
              )}
            </ListBox>
          </AppMenuPopover>
        </ComboBox>
        <Tooltip
          content={
            fontFamilyInputValue === copy.defaultValue
              ? 'Already set to default'
              : 'Reset to default'
          }
          showWhenDisabled={fontFamilyInputValue === copy.defaultValue}
        >
          <MotionIconButton
            {...getDefaultButtonVariants()}
            aria-label="Reset font family"
            isDisabled={fontFamilyInputValue === copy.defaultValue}
            onPress={() => {
              setFontFamilyInputValue(copy.defaultValue);
              updateFontFamily(copy.defaultValue);
            }}
          >
            <ArrowRotateAnticlockwise width="0.75rem" height="0.75rem" />
          </MotionIconButton>
        </Tooltip>
      </div>
    </SettingsRow>
  );
}
