import { useState } from 'react';
import { AppearancePage } from './appearance/index';
import { GithubPage } from './github-page';
import { SettingsSidebar } from './sidebar';
import { MotionButton } from '../buttons';
import { FloppyDisk } from '../../icons/floppy-disk';
import { getDefaultButtonVariants } from '../../animations';
import { CodeBlockPage } from './code-block-page';

export type SettingsTab = 'appearance' | 'github' | 'code-block';

export function SettingsDialog() {
  const [currentSettingsTab, setCurrentSettingsTab] =
    useState<SettingsTab>('appearance');
  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col justify-between overflow-y-hidden">
      <div className="flex gap-4 overflow-y-auto">
        <SettingsSidebar
          currentSettingsTab={currentSettingsTab}
          setCurrentSettingsTab={setCurrentSettingsTab}
        />
        <div className="overflow-auto pr-5">
          {currentSettingsTab === 'appearance' && <AppearancePage />}
          {currentSettingsTab === 'github' && <GithubPage />}
          {currentSettingsTab === 'code-block' && <CodeBlockPage />}
          <div className="grid grid-cols-2 px-0.5 border-b border-zinc-200 dark:border-zinc-700 " />
        </div>
      </div>
      <footer className="border-t border-zinc-200 dark:border-zinc-700 pt-2 pb-3 pr-2 mt-1.5">
        <MotionButton
          type="submit"
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
