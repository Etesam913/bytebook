import { Activity, lazy, Suspense } from 'react';
import { NotFound } from './routes/not-found';
import { useMotionValue } from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai/react';
import { Toaster } from 'sonner';
import { Route, Switch } from 'wouter';
import { contextMenuDataAtom, isNoteMaximizedAtom } from './atoms';
import { ContextMenu } from './components/context-menu';
import { Dialog } from './components/dialog';
import { FileSidebar } from './components/file-sidebar';
import { LoadingModal } from './components/loading-modal';
import { useProjectSettings } from './hooks/project-settings';
import { useTagEvents } from './hooks/tags';
import { useThemeSetting } from './hooks/theme';
import { MAX_SIDEBAR_WIDTH } from './utils/general';
import { disableBackspaceNavigation } from './utils/routing';
import {
  routeUrls,
  type SavedSearchRouteParams,
  type SearchRouteParams,
} from './utils/routes';
import { RouteFallback } from './components/route-fallback';
import { useZoom, useFullscreen, useWindowReload } from './hooks/resize';
import { useRestoreLastVisitedOnLaunch } from './hooks/routes';
import { EditorWrapper } from './components/virtualized/virtualized-file-tree/editor-wrapper';
import { VirtualizedFileTreeDebugView } from './components/virtualized/virtualized-file-tree/debug-view';
import { useCreateEvents } from './components/virtualized/virtualized-file-tree/hooks/use-create-events';
import { useDeleteEvents } from './components/virtualized/virtualized-file-tree/hooks/use-delete-events';
import { useRenameEvents } from './components/virtualized/virtualized-file-tree/hooks/use-rename-events';
import { safeDecodeURIComponent } from './utils/path';
import { isRegularMouseClick } from './utils/mouse';

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

const SearchContentArea = lazy(() =>
  import('./routes/search/search-content-area').then((module) => ({
    default: module.SearchContentArea,
  }))
);

disableBackspaceNavigation();

function App() {
  const fileSidebarWidth = useMotionValue(MAX_SIDEBAR_WIDTH);
  const notesSidebarWidth = useMotionValue(MAX_SIDEBAR_WIDTH);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);

  useCreateEvents();
  useDeleteEvents();
  useRenameEvents();
  useTagEvents();
  useThemeSetting();
  useProjectSettings();
  useZoom();
  useFullscreen();
  useWindowReload();
  useRestoreLastVisitedOnLaunch();

  return (
    <main
      id="App"
      className="flex h-full w-full min-w-0 font-display overflow-hidden relative"
      onClick={(e) => {
        if (isRegularMouseClick(e.nativeEvent)) {
          setContextMenuData((prev) => ({ ...prev, isShowing: false }));
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-zinc-50 dark:focus:bg-zinc-800 focus:rounded-md focus:shadow-md focus:text-sm"
      >
        Skip to main content
      </a>
      <ContextMenu />
      <Dialog />
      <LoadingModal />
      <Toaster richColors theme="system" />
      <VirtualizedFileTreeDebugView />
      <Activity mode={isNoteMaximized ? 'hidden' : 'visible'}>
        <FileSidebar width={fileSidebarWidth} />
      </Activity>
      <div id="main-content" className="flex-1 min-w-0 h-full">
        <Switch>
          <Route path={routeUrls.patterns.ROOT} />
          <Route path={routeUrls.patterns.SAVED_SEARCH}>
            {(params: SavedSearchRouteParams) => (
              <Suspense fallback={<RouteFallback />}>
                <SavedSearchPage
                  searchQuery={safeDecodeURIComponent(params.searchQuery)}
                  curPath={
                    params['*']
                      ? safeDecodeURIComponent(params['*'])
                          .split('/')
                          .filter(Boolean)
                          .join('/')
                      : undefined
                  }
                  width={notesSidebarWidth}
                />
              </Suspense>
            )}
          </Route>

          <Route path="/notes/*">
            <EditorWrapper />
          </Route>

          <Route path={routeUrls.patterns.NOT_FOUND_FALLBACK}>
            <NotFound />
          </Route>

          <Route path={routeUrls.patterns.KERNELS}>
            <Suspense fallback={<RouteFallback />}>
              <KernelInfo />
            </Suspense>
          </Route>

          <Route path={routeUrls.patterns.SEARCH}>
            {(params: SearchRouteParams) => (
              <Suspense fallback={<RouteFallback />}>
                <SearchContentArea
                  curPath={
                    params['*']
                      ? safeDecodeURIComponent(params['*'])
                          .split('/')
                          .filter(Boolean)
                          .join('/')
                      : undefined
                  }
                />
              </Suspense>
            )}
          </Route>

          <Route path={'*'}>
            <NotFound />
          </Route>
        </Switch>
      </div>
    </main>
  );
}

export default App;
