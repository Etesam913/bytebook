import { useRef } from 'react';
import type {
  Dispatch,
  KeyboardEvent,
  ReactNode,
  SetStateAction,
} from 'react';
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

export function getSettingsTabId(tab: SettingsTab) {
  return `settings-tab-${tab}`;
}

export function SettingsSidebar({
  currentSettingsTab,
  setCurrentSettingsTab,
  settingsPanelId,
}: {
  currentSettingsTab: SettingsTab;
  setCurrentSettingsTab: Dispatch<SetStateAction<SettingsTab>>;
  settingsPanelId: string;
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedTabIndex = settingsItems.findIndex(
    (item) => item.id === currentSettingsTab
  );
  const safeSelectedTabIndex = selectedTabIndex === -1 ? 0 : selectedTabIndex;

  const focusAndSelectTabByIndex = (nextTabIndex: number) => {
    const nextTab = settingsItems[nextTabIndex];
    if (!nextTab) return;
    setCurrentSettingsTab(nextTab.id);
    tabRefs.current[nextTabIndex]?.focus();
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    let nextTabIndex = -1;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      nextTabIndex = (safeSelectedTabIndex + 1) % settingsItems.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      nextTabIndex =
        (safeSelectedTabIndex - 1 + settingsItems.length) % settingsItems.length;
    } else if (e.key === 'Home') {
      nextTabIndex = 0;
    } else if (e.key === 'End') {
      nextTabIndex = settingsItems.length - 1;
    }

    if (nextTabIndex !== -1) {
      e.preventDefault();
      focusAndSelectTabByIndex(nextTabIndex);
    }
  };

  const settingElements = settingsItems.map((item, index) => {
    const isCurrentTab = item.id === currentSettingsTab;

    return (
      <button
        id={getSettingsTabId(item.id)}
        type="button"
        role="tab"
        aria-controls={settingsPanelId}
        aria-selected={isCurrentTab}
        tabIndex={isCurrentTab ? 0 : -1}
        ref={(el) => {
          tabRefs.current[index] = el;
        }}
        className={cn(
          'hover:bg-zinc-100 dark:hover:bg-zinc-650 py-1 px-2.5 rounded-md flex items-center gap-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-color)',
          isCurrentTab &&
            'bg-zinc-150 hover:bg-zinc-150 dark:bg-zinc-650 dark:hover:bg-zinc-650'
        )}
        onClick={() => setCurrentSettingsTab(item.id)}
        onKeyDown={handleTabKeyDown}
        key={item.id}
      >
        {item.icon}
        {item.title}
      </button>
    );
  });
  return (
    <aside
      role="tablist"
      aria-label="Settings categories"
      aria-orientation="vertical"
      className="flex flex-col gap-1 pt-3 pl-0.5"
    >
      {settingElements}
    </aside>
  );
}
