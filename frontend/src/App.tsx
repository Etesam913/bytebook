import { lazy, Suspense } from 'react';
import { useMotionValue } from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai/react';
import { Toaster } from 'sonner';
import { Route, Switch } from 'wouter';
import { contextMenuDataAtom, isNoteMaximizedAtom } from './atoms';
import { ContextMenu } from './components/context-menu';
import { Dialog } from './components/dialog';
import { FolderSidebar } from './components/folder-sidebar';
import { LoadingModal } from './components/loading-modal';
import { SearchPanel } from './components/search-panel';
import { useLoggedInEvent, useUserData } from './hooks/auth';
import { useProjectSettings } from './hooks/project-settings';
import { useSearchPanel } from './hooks/search';
import { useTags } from './hooks/tag-events';
import { useDarkModeSetting } from './hooks/theme';
import { MAX_SIDEBAR_WIDTH } from './utils/general';

// Lazy load route components
const NotFound = lazy(() =>
  import('./routes/not-found').then((module) => ({
    default: module.NotFound,
  }))
);

const NotesSidebar = lazy(() =>
  import('./routes/notes-sidebar').then((module) => ({
    default: module.NotesSidebar,
  }))
);

const TagsSidebar = lazy(() =>
  import('./routes/tags-sidebar').then((module) => ({
    default: module.TagsSidebar,
  }))
);

export const WINDOW_ID = `id-${Math.random().toString(16).slice(2)}`;

// Route loading fallback component
const RouteFallback = () => (
  <div className="flex-grow flex items-center justify-center">
    <div className="animate-pulse text-gray-400">Loading route...</div>
  </div>
);

function App() {
  const folderSidebarWidth = useMotionValue(MAX_SIDEBAR_WIDTH);
  const notesSidebarWidth = useMotionValue(MAX_SIDEBAR_WIDTH);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  useUserData();
  useTags();
  useLoggedInEvent();
  useDarkModeSetting();
  useSearchPanel();
  useProjectSettings();

  return (
    <main
      id="App"
      className="flex max-h-screen font-display overflow-hidden"
      onClick={(e) => {
        if (!e.ctrlKey) {
          setContextMenuData((prev) => ({ ...prev, isShowing: false }));
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ContextMenu />
      <Dialog />
      <SearchPanel />
      <LoadingModal />
      <Toaster richColors theme="system" />
      {!isNoteMaximized && <FolderSidebar width={folderSidebarWidth} />}
      <Switch>
        <Route path="/" />
        <Route path="/tags/:tagName/:folder?/:note?">
          {(folderParams) => (
            <Suspense fallback={<RouteFallback />}>
              <TagsSidebar
                params={
                  folderParams as {
                    tagName: string;
                    folder?: string;
                    note?: string;
                  }
                }
                width={notesSidebarWidth}
                leftWidth={folderSidebarWidth}
              />
            </Suspense>
          )}
        </Route>

        <Route path="/:folder/:note?">
          {(folderParams) => (
            <Suspense fallback={<RouteFallback />}>
              <NotesSidebar
                params={folderParams}
                width={notesSidebarWidth}
                leftWidth={folderSidebarWidth}
              />
            </Suspense>
          )}
        </Route>
        <Route path="*">
          <Suspense fallback={<RouteFallback />}>
            <NotFound />
          </Suspense>
        </Route>
      </Switch>
    </main>
  );
}

export default App;
