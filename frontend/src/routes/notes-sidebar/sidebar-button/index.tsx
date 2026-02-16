import { handleKeyNavigation } from '../../../utils/selection';
import { type FilePath } from '../../../utils/path';
import { ListNoteSidebarItem } from './list-note-sidebar-item';
import { navigate } from 'wouter/use-browser-location';

export function NoteSidebarButton({
  sidebarNotePath,
  activeNotePath,
}: {
  sidebarNotePath: FilePath;
  activeNotePath: FilePath | undefined;
}) {
  return (
    <button
      type="button"
      title={sidebarNotePath.fullPath}
      draggable
      onKeyDown={(e) => handleKeyNavigation(e)}
      className="list-sidebar-item"
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
