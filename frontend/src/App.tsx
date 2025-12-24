import { Activity, lazy, Suspense } from 'react';
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
import { useRouteFilePath } from './hooks/events';
import { useProjectSettings } from './hooks/project-settings';
import { useSearch } from './hooks/search';
import { useTagEvents } from './hooks/tags';
import { useThemeSetting } from './hooks/theme';
import { MAX_SIDEBAR_WIDTH } from './utils/general';
import { disableBackspaceNavigation } from './utils/routing';
import {
  type NotesRouteParams,
  routeUrls,
  type SavedSearchRouteParams,
} from './utils/routes';
import { RouteFallback } from './components/route-fallback';
import { useTrapFocus } from './hooks/general';
import { useZoom, useFullscreen, useWindowReload } from './hooks/resize';

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
  import('./routes/kernel-info').then((module) => ({
    default: module.KernelInfo,
  }))
);

const SavedSearchPage = lazy(() =>
  import('./routes/saved-search').then((module) => ({
    default: module.SavedSearchPage,
  }))
);

const SearchPage = lazy(() =>
  import('./routes/search').then((module) => ({
    default: module.SearchPage,
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

  useTagEvents();
  useTrapFocus();
  useThemeSetting();
  useSearch();
  useProjectSettings();
  useZoom();
  useFullscreen();
  useWindowReload();
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
      <LoadingModal />
      <Toaster richColors theme="system" />
      <Activity
        mode={
          isNoteMaximized || location.startsWith('/search')
            ? 'hidden'
            : 'visible'
        }
      >
        <FolderSidebar width={folderSidebarWidth} />
      </Activity>
      <Switch>
        <Route path={routeUrls.patterns.ROOT} />

        <Route path={routeUrls.patterns.NOT_FOUND_FALLBACK}>
          <Suspense fallback={<RouteFallback />}>
            <NotFound />
          </Suspense>
        </Route>

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
          {(params: SavedSearchRouteParams) => (
            <Suspense fallback={<RouteFallback />}>
              <SavedSearchPage
                searchQuery={decodeURIComponent(params.searchQuery)}
                curFolder={
                  params.folder ? decodeURIComponent(params.folder) : undefined
                }
                curNote={
                  params.note ? decodeURIComponent(params.note) : undefined
                }
                width={notesSidebarWidth}
                leftWidth={folderSidebarWidth}
              />
            </Suspense>
          )}
        </Route>

        <Route path={routeUrls.patterns.NOTES}>
          {(folderParams: NotesRouteParams) => (
            <Suspense fallback={<RouteFallback />}>
              <NotesSidebar
                curFolder={decodeURIComponent(folderParams.folder)}
                curNote={
                  folderParams.note
                    ? decodeURIComponent(folderParams.note)
                    : undefined
                }
                width={notesSidebarWidth}
                leftWidth={folderSidebarWidth}
              />
            </Suspense>
          )}
        </Route>
        <Route path={'*'}>
          <Suspense fallback={<RouteFallback />}>
            <NotFound />
          </Suspense>
        </Route>
      </Switch>
    </main>
  );
}

export default App;
