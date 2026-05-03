import { useEffect, type RefObject } from 'react';
import { useSetAtom } from 'jotai';
import { useLocation } from 'wouter';
import {
  navigate,
  useSearch as useBrowserSearch,
} from 'wouter/use-browser-location';
import { useWailsEvent } from '../../hooks/events';
import { MotionIconButton } from '../buttons';
import { getDefaultButtonVariants } from '../../animations';
import { isFileMaximizedAtom } from '../../atoms';
import { Note } from '../../icons/page';
import { Magnifier } from '../../icons/magnifier';
import { Tooltip } from '../tooltip';
import { isSearchSidebarRoute } from '../../utils/sidebar-routes';
import { cn } from '../../utils/string-formatting';
import {
  isEventInCurrentWindow,
  SIDEBAR_FILES_OPEN,
  SIDEBAR_SEARCH_OPEN,
} from '../../utils/events';

export function SidebarModeToggle({
  lastFilesRouteRef,
  lastSearchRouteRef,
}: {
  lastFilesRouteRef: RefObject<string>;
  lastSearchRouteRef: RefObject<string>;
}) {
  const [pathname] = useLocation();
  const browserSearch = useBrowserSearch();
  const isSearchSidebar = isSearchSidebarRoute(pathname);
  const setIsFileMaximized = useSetAtom(isFileMaximizedAtom);

  // Ensures that the lastFileRoute or the lastSearchRoute is kept up to date when route changes
  useEffect(() => {
    const currentRoute = `${pathname}${browserSearch}`;

    if (isSearchSidebar) {
      lastSearchRouteRef.current = currentRoute;
      return;
    }

    lastFilesRouteRef.current = currentRoute;
  }, [browserSearch, isSearchSidebar, pathname]);

  useWailsEvent(SIDEBAR_FILES_OPEN, (data) => {
    void (async () => {
      if (!(await isEventInCurrentWindow(data))) return;
      setIsFileMaximized(false);
      if (isSearchSidebar) {
        navigate(lastFilesRouteRef.current);
      }
    })();
  });

  useWailsEvent(SIDEBAR_SEARCH_OPEN, (data) => {
    void (async () => {
      if (!(await isEventInCurrentWindow(data))) return;
      setIsFileMaximized(false);
      if (!isSearchSidebar) {
        navigate(lastSearchRouteRef.current);
      }
    })();
  });

  return (
    <div className="flex gap-1">
      <Tooltip content="Files (⌘⇧E)" placement="bottom">
        <MotionIconButton
          {...getDefaultButtonVariants()}
          onClick={() => {
            if (isSearchSidebar) {
              navigate(lastFilesRouteRef.current);
            }
          }}
          aria-label="Files"
          className={cn(
            !isSearchSidebar &&
              'bg-zinc-150 dark:bg-zinc-650 text-(--accent-color)'
          )}
        >
          <Note width="1.125rem" height="1.125rem" />
        </MotionIconButton>
      </Tooltip>
      <Tooltip content="Search (⌘⇧F)" placement="bottom">
        <MotionIconButton
          {...getDefaultButtonVariants()}
          onClick={() => {
            if (!isSearchSidebar) {
              navigate(lastSearchRouteRef.current);
            }
          }}
          aria-label="Search"
          className={cn(
            isSearchSidebar &&
              'bg-zinc-150 dark:bg-zinc-650 text-(--accent-color)'
          )}
        >
          <Magnifier width="1rem" height="1rem" />
        </MotionIconButton>
      </Tooltip>
    </div>
  );
}
