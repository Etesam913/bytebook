import { handleKeyNavigation } from '../../../utils/selection';
import { cn } from '../../../utils/string-formatting';
import { type FilePath } from '../../../utils/path';
import { ListNoteSidebarItem } from './list-note-sidebar-item';
import { navigate } from 'wouter/use-browser-location';

export function NoteSidebarButton({
  sidebarNotePath,
  activeNotePath,
  sidebarNoteIndex,
}: {
  sidebarNotePath: FilePath;
  activeNotePath: FilePath | undefined;
  sidebarNoteIndex: number;
}) {
  return (
    <button
      type="button"
      title={sidebarNotePath.fullPath}
      draggable
      onKeyDown={(e) => handleKeyNavigation(e)}
      className={cn(
        'list-sidebar-item',
        sidebarNoteIndex === 0 && 'border-t'
        // isActive && 'bg-zinc-150 dark:bg-zinc-700'
      )}
      onClick={() => {
        navigate(`/saved-search/${sidebarNotePath.encodedPath}`);
      }}
    >
      <ListNoteSidebarItem
        sidebarNotePath={sidebarNotePath}
        activeNotePath={activeNotePath}
      />
    </button>
  );
}
