import { lazy, Suspense } from 'react';
import { useMotionValue } from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai/react';
import { Toaster } from 'sonner';
import { Route, Switch, useLocation } from 'wouter';
import { contextMenuDataAtom } from './atoms';
import { isNoteMaximizedAtom } from './atoms';
import { ContextMenu } from './components/context-menu';
import { Dialog } from './components/dialog';
import { FolderSidebar } from './components/folder-sidebar';
import { LoadingModal } from './components/loading-modal';
import { SearchPanel } from './components/search-panel';
import { useLoggedInEvent, useUserData } from './hooks/auth';
import { useRouteFilePath } from './hooks/events';
import { useProjectSettings } from './hooks/project-settings';
import { useSearch } from './hooks/search';
import { useTagEvents } from './hooks/tags';
import { useThemeSetting } from './hooks/theme';
import { MAX_SIDEBAR_WIDTH } from './utils/general';
import { disableBackspaceNavigation } from './utils/routing';
import { routeUrls } from './utils/routes';
import { RouteFallback } from './components/route-fallback';
import { useTrapFocus } from './hooks/general';
import { useZoom } from './hooks/resize';
import { SearchPage } from './components/search-page';

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

const KernelInfo = lazy(() =>
  import('./components/kernel-info').then((module) => ({
    default: module.KernelInfo,
  }))
);

const SavedSearchPage = lazy(() =>
  import('./components/saved-search-page').then((module) => ({
    default: module.SavedSearchPage,
  }))
);

export const WINDOW_ID = `id-${Math.random().toString(16).slice(2)}`;

disableBackspaceNavigation();

function App() {
  const folderSidebarWidth = useMotionValue(MAX_SIDEBAR_WIDTH);
  const notesSidebarWidth = useMotionValue(MAX_SIDEBAR_WIDTH);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const [location] = useLocation();

  useUserData();
  useTagEvents();
  useTrapFocus();
  useLoggedInEvent();
  useThemeSetting();
  useSearch();
  useProjectSettings();
  useZoom();
  useRouteFilePath();

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
      {!isNoteMaximized && !location.startsWith('/search') && (
        <FolderSidebar width={folderSidebarWidth} />
      )}
      <Switch>
        <Route path={routeUrls.patterns.ROOT} />
        <Route path={routeUrls.patterns.KERNELS}>
          <Suspense fallback={<RouteFallback />}>
            <KernelInfo />
          </Suspense>
        </Route>

        <Route path={routeUrls.patterns.SEARCH}>
          <Suspense fallback={<RouteFallback />}>
            <SearchPage />
          </Suspense>
        </Route>

        <Route path={routeUrls.patterns.SAVED_SEARCH}>
          {(params: {
            searchQuery: string;
            folder?: string;
            note?: string;
          }) => (
            <Suspense fallback={<RouteFallback />}>
              <SavedSearchPage
                searchQuery={decodeURIComponent(params.searchQuery)}
                folder={
                  params.folder ? decodeURIComponent(params.folder) : undefined
                }
                note={params.note ? decodeURIComponent(params.note) : undefined}
                width={notesSidebarWidth}
                leftWidth={folderSidebarWidth}
              />
            </Suspense>
          )}
        </Route>

        <Route path={routeUrls.patterns.NOTES}>
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
        <Route path={routeUrls.patterns.CATCH_ALL}>
          <Suspense fallback={<RouteFallback />}>
            <NotFound />
          </Suspense>
        </Route>
      </Switch>
    </main>
  );
}

export default App;
