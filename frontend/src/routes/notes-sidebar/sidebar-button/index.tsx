import { handleKeyNavigation } from '../../../utils/selection';
import { type FilePath } from '../../../utils/path';
import { ListNoteSidebarItem } from './list-note-sidebar-item';
import { navigate } from 'wouter/use-browser-location';
import { routeUrls } from '../../../utils/routes';
import { cn } from '../../../utils/string-formatting';

export function NoteSidebarButton({
  searchQuery,
  sidebarNotePath,
  activeNotePath,
}: {
  searchQuery: string;
  sidebarNotePath: FilePath;
  activeNotePath: FilePath | undefined;
}) {
  const isActive = activeNotePath
    ? sidebarNotePath.equals(activeNotePath)
    : false;

  return (
    <button
      type="button"
      title={sidebarNotePath.fullPath}
      draggable
      onKeyDown={(e) => handleKeyNavigation(e)}
      className={cn(
        'list-sidebar-item',
        isActive && 'bg-zinc-150 dark:bg-zinc-700'
      )}
      onClick={() => {
        navigate(
          routeUrls.savedSearch(searchQuery, sidebarNotePath.encodedPath)
        );
      }}
    >
      <ListNoteSidebarItem
        sidebarNotePath={sidebarNotePath}
        activeNotePath={activeNotePath}
      />
    </button>
  );
}
