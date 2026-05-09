import type { ReactNode } from 'react';
import { Tab, TabList } from 'react-aria-components';
import type { SettingsTab } from '.';
import { ColorPalette2 } from '../../icons/color-palette-2';
import { cn } from '../../utils/string-formatting';
import WindowCode from '../../icons/window-code';
import { Magnifier } from '../../icons/magnifier';
import { Text } from '../../icons/text';

const settingsItems: {
  id: SettingsTab;
  title: string;
  icon: ReactNode;
}[] = [
  { id: 'general', title: 'General', icon: <ColorPalette2 /> },
  { id: 'editor', title: 'Editor', icon: <Text /> },
  { id: 'code-block', title: 'Code', icon: <WindowCode /> },
  {
    id: 'search',
    title: 'Search',
    icon: <Magnifier width="1rem" height="1rem" />,
  },
];

export function SettingsSidebar() {
  return (
    <TabList
      aria-label="Settings categories"
      className="flex flex-col gap-1 pt-3 pl-0.5 pb-2"
    >
      {settingsItems.map((item) => (
        <Tab
          key={item.id}
          id={item.id}
          className={({ isSelected }: { isSelected: boolean }) =>
            cn(
              'hover:bg-zinc-100 dark:hover:bg-zinc-650 py-1 px-2.5 rounded-md flex items-center gap-1.5 text-left whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-color) cursor-default',
              isSelected &&
                'bg-zinc-150 hover:bg-zinc-150 dark:bg-zinc-650 dark:hover:bg-zinc-650'
            )
          }
        >
          <span className="min-w-4 shrink-0">{item.icon}</span>
          {item.title}
        </Tab>
      ))}
    </TabList>
  );
}
