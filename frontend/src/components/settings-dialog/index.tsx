import { useState } from 'react';
import { AppearancePage } from './appearance/index';
import { GithubPage } from './github-page';
import { SettingsSidebar } from './sidebar';

export type SettingsTab = 'appearance' | 'github' | 'code-block';

export function SettingsDialog() {
  const [currentSettingsTab, setCurrentSettingsTab] =
    useState<SettingsTab>('appearance');
  return (
    <div className="flex gap-4 h-[calc(100vh-10rem)]">
      <SettingsSidebar
        currentSettingsTab={currentSettingsTab}
        setCurrentSettingsTab={setCurrentSettingsTab}
      />
      <div className="flex-1 overflow-auto">
        {currentSettingsTab === 'appearance' && <AppearancePage />}
        {currentSettingsTab === 'github' && <GithubPage />}
        {currentSettingsTab === 'code-block' && <div>code-block content</div>}
        <div className="grid grid-cols-2 px-0.5 border-b border-zinc-200 dark:border-zinc-700 " />
      </div>
    </div>
  );
}
