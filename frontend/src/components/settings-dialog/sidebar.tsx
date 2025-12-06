import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { SettingsTab } from '.';
import { ColorPalette2 } from '../../icons/color-palette-2';
import { cn } from '../../utils/string-formatting';
import WindowCode from '../../icons/window-code';
import { Magnifier } from '../../icons/magnifier';

const settingsItems: { id: SettingsTab; title: string; icon: ReactNode }[] = [
  { id: 'appearance', title: 'Appearance', icon: <ColorPalette2 /> },
  { id: 'code-block', title: 'Code Block', icon: <WindowCode /> },
  { id: 'search', title: 'Search', icon: <Magnifier width={16} height={16} /> },
];

export function SettingsSidebar({
  currentSettingsTab,
  setCurrentSettingsTab,
}: {
  currentSettingsTab: SettingsTab;
  setCurrentSettingsTab: Dispatch<SetStateAction<SettingsTab>>;
}) {
  const settingElements = settingsItems.map((item) => {
    return (
      <button
        type="button"
        className={cn(
          'hover:bg-zinc-100 dark:hover:bg-zinc-650 py-1 px-2.5 rounded-md transition-colors flex items-center gap-1.5 text-left',
          item.id === currentSettingsTab &&
            'bg-zinc-150 hover:bg-zinc-150 dark:bg-zinc-650 dark:hover:bg-zinc-650'
        )}
        onClick={() => setCurrentSettingsTab(item.id)}
        key={item.id}
      >
        {item.icon}
        {item.title}
      </button>
    );
  });
  return (
    <aside className="flex flex-col gap-1 pt-3 pl-0.5">{settingElements}</aside>
  );
}
