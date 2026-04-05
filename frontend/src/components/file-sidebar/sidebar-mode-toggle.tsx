import { useEffect, type RefObject } from 'react';
import { useLocation } from 'wouter';
import {
  navigate,
  useSearch as useBrowserSearch,
} from 'wouter/use-browser-location';
import { useWailsEvent } from '../../hooks/events';
import { MotionIconButton } from '../buttons';
import { getDefaultButtonVariants } from '../../animations';
import { Note } from '../../icons/page';
import { Magnifier } from '../../icons/magnifier';
import { Tooltip } from '../tooltip';
import { isSearchSidebarRoute } from '../../utils/sidebar-routes';
import { cn } from '../../utils/string-formatting';
import { isEventInCurrentWindow, SEARCH_OPEN } from '../../utils/events';

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

  // Ensures that the lastFileRoute or the lastSearchRoute is kept up to date when route changes
  useEffect(() => {
    const currentRoute = `${pathname}${browserSearch}`;

    if (isSearchSidebar) {
      lastSearchRouteRef.current = currentRoute;
      return;
    }

    lastFilesRouteRef.current = currentRoute;
  }, [browserSearch, isSearchSidebar, pathname]);

  // Toggles the sidebar mode when the "search:open" event is received
  useWailsEvent(SEARCH_OPEN, (data) => {
    void (async () => {
      if (!(await isEventInCurrentWindow(data))) return;

      if (isSearchSidebar) {
        navigate(lastFilesRouteRef.current);
        return;
      }

      navigate(lastSearchRouteRef.current);
    })();
  });

  return (
    <div className="flex gap-1">
      <Tooltip content="Files" placement="right">
        <MotionIconButton
          {...getDefaultButtonVariants()}
          onClick={() => {
            if (isSearchSidebar) {
              navigate(lastFilesRouteRef.current);
            }
          }}
          aria-label="Files"
          className={cn(!isSearchSidebar && 'bg-zinc-200 dark:bg-zinc-650')}
        >
          <Note width="1.125rem" height="1.125rem" />
        </MotionIconButton>
      </Tooltip>
      <Tooltip content="Search" placement="right">
        <MotionIconButton
          {...getDefaultButtonVariants()}
          onClick={() => {
            if (!isSearchSidebar) {
              navigate(lastSearchRouteRef.current);
            }
          }}
          aria-label="Search"
          className={cn(isSearchSidebar && 'bg-zinc-200 dark:bg-zinc-650')}
        >
          <Magnifier width="1rem" height="1rem" />
        </MotionIconButton>
      </Tooltip>
    </div>
  );
}
