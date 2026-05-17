import { useAtomValue } from 'jotai/react';
import { CheckboxGroup } from 'react-aria-components/CheckboxGroup';
import { projectSettingsAtom } from '../../../atoms';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import type { SidebarVisibility } from '../../../types';
import { AppCheckbox } from '../../checkbox';
import { SettingsRow } from '../settings-row';

type SectionKey = 'pinned' | 'recent' | 'kernels' | 'tags' | 'savedSearches';

const SIDEBAR_SECTION_OPTIONS: {
  value: SectionKey;
  label: string;
  hideKey: keyof SidebarVisibility;
}[] = [
  { value: 'pinned', label: 'Pinned', hideKey: 'hidePinned' },
  { value: 'recent', label: 'Recent', hideKey: 'hideRecent' },
  { value: 'kernels', label: 'Kernels', hideKey: 'hideKernels' },
  { value: 'tags', label: 'Tags', hideKey: 'hideTags' },
  {
    value: 'savedSearches',
    label: 'Saved Searches',
    hideKey: 'hideSavedSearches',
  },
];

function visibilityToSelectedKeys(visibility: SidebarVisibility): string[] {
  return SIDEBAR_SECTION_OPTIONS.filter(
    ({ hideKey }) => !visibility[hideKey]
  ).map(({ value }) => value);
}

export function SidebarSectionsRow() {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useAtomValue(projectSettingsAtom);
  const visibility = projectSettings.appearance.sidebarVisibility;
  const selectedKeys = visibilityToSelectedKeys(visibility);

  const handleChange = (newSelectedKeys: string[]) => {
    const selectedSet = new Set(newSelectedKeys);
    const nextVisibility: SidebarVisibility = {
      hidePinned: !selectedSet.has('pinned'),
      hideRecent: !selectedSet.has('recent'),
      hideKernels: !selectedSet.has('kernels'),
      hideTags: !selectedSet.has('tags'),
      hideSavedSearches: !selectedSet.has('savedSearches'),
    };
    updateProjectSettings({
      newProjectSettings: {
        ...projectSettings,
        appearance: {
          ...projectSettings.appearance,
          sidebarVisibility: nextVisibility,
        },
      },
    });
  };

  return (
    <SettingsRow
      title="Sidebar Sections"
      description="Choose which sections to show in the file sidebar."
    >
      <CheckboxGroup
        aria-label="Sidebar sections"
        value={selectedKeys}
        onChange={handleChange}
        className="flex flex-col gap-2"
      >
        {SIDEBAR_SECTION_OPTIONS.map(({ value, label }) => (
          <AppCheckbox
            key={value}
            value={value}
            className="text-zinc-700 dark:text-zinc-200"
          >
            {label}
          </AppCheckbox>
        ))}
      </CheckboxGroup>
    </SettingsRow>
  );
}
