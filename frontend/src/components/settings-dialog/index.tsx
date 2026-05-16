import { Tabs, TabPanel } from 'react-aria-components/Tabs';
import { SettingsSidebar } from './sidebar';
import { MotionButton } from '../buttons';
import { XMark } from '../../icons/circle-xmark';
import { getDefaultButtonVariants } from '../../animations';
import { CodeBlockPage } from './code-block-page';
import { SearchPage } from './search-page';
import { GeneralPage } from './general-page';
import { EditorPage } from './editor-page';

export type SettingsTab = 'general' | 'editor' | 'code-block' | 'search';

export function SettingsDialog() {
  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col justify-between overflow-y-hidden">
      <Tabs
        orientation="vertical"
        defaultSelectedKey="general"
        className="flex gap-4 overflow-y-auto"
      >
        <SettingsSidebar />
        <TabPanel id="general" className="overflow-auto pr-5">
          <GeneralPage />
          <div
            aria-hidden="true"
            className="grid grid-cols-2 px-0.5 border-b border-zinc-200 dark:border-zinc-700"
          />
        </TabPanel>
        <TabPanel id="editor" className="overflow-auto pr-5">
          <EditorPage />
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
          aria-label="Close settings"
          aria-keyshortcuts="Meta+Enter"
          {...getDefaultButtonVariants()}
          className="ml-auto w-36 flex justify-center"
        >
          <XMark />
          Close
        </MotionButton>
      </footer>
    </div>
  );
}
