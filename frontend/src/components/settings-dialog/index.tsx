import { Tabs, TabPanel } from 'react-aria-components';
import { AppearancePage } from './appearance/index';
import { SettingsSidebar } from './sidebar';
import { MotionButton } from '../buttons';
import { FloppyDisk } from '../../icons/floppy-disk';
import { getDefaultButtonVariants } from '../../animations';
import { CodeBlockPage } from './code-block-page';
import { SearchPage } from './search-page';

export type SettingsTab = 'appearance' | 'code-block' | 'search';

export function SettingsDialog() {
  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col justify-between overflow-y-hidden">
      <Tabs
        orientation="vertical"
        defaultSelectedKey="appearance"
        className="flex gap-4 overflow-y-auto"
      >
        <SettingsSidebar />
        <TabPanel id="appearance" className="overflow-auto pr-5">
          <AppearancePage />
          <div
            aria-hidden="true"
            className="grid grid-cols-2 px-0.5 border-b border-zinc-200 dark:border-zinc-700"
          />
        </TabPanel>
        <TabPanel id="code-block" className="overflow-auto pr-5">
          <CodeBlockPage />
          <div
            aria-hidden="true"
            className="grid grid-cols-2 px-0.5 border-b border-zinc-200 dark:border-zinc-700"
          />
        </TabPanel>
        <TabPanel id="search" className="overflow-auto pr-5">
          <SearchPage />
          <div
            aria-hidden="true"
            className="grid grid-cols-2 px-0.5 border-b border-zinc-200 dark:border-zinc-700"
          />
        </TabPanel>
      </Tabs>
      <footer className="border-t border-zinc-200 dark:border-zinc-700 pt-2 pb-3 pr-2 mt-1.5">
        <MotionButton
          type="submit"
          aria-label="Save settings"
          aria-keyshortcuts="Meta+Enter"
          {...getDefaultButtonVariants()}
          className="ml-auto w-36 flex justify-center"
        >
          <FloppyDisk />
          Save
        </MotionButton>
      </footer>
    </div>
  );
}
