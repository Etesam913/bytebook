import {
  useProjectSettingsQuery,
  useUpdateProjectSettingsMutation,
} from '@hooks/project-settings';
import { CheckboxGroup } from 'react-aria-components/CheckboxGroup';
import type { SidebarVisibility } from '@/types';
import { SIDEBAR_SECTION_OPTIONS } from '@utils/sidebar-panels';
import { AppCheckbox } from '@components/checkbox';
import { SettingsRow } from '../settings-row';

function visibilityToSelectedKeys(visibility: SidebarVisibility): string[] {
  return SIDEBAR_SECTION_OPTIONS.filter(
    ({ hideKey }) => !visibility[hideKey]
  ).map(({ value }) => value);
}

export function SidebarSectionsRow() {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useProjectSettingsQuery().data;
  const visibility = projectSettings.appearance.sidebarVisibility;
  const selectedKeys = visibilityToSelectedKeys(visibility);

  const handleChange = (newSelectedKeys: string[]) => {
    const selectedSet = new Set(newSelectedKeys);
    const nextVisibility = { ...visibility };
    for (const { value, hideKey } of SIDEBAR_SECTION_OPTIONS) {
      nextVisibility[hideKey] = !selectedSet.has(value);
    }
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
