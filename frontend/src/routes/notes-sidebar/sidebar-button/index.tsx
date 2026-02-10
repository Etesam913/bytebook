import { useAtom, useSetAtom } from 'jotai/react';
import { selectionRangeAtom } from '../../../atoms';
import { draggedGhostElementAtom } from '../../../components/editor/atoms';
import { handleNoteDragStart } from '../../../components/virtualized/virtualized-list/utils';
import { handleKeyNavigation } from '../../../utils/selection';
import { cn } from '../../../utils/string-formatting';
import { LocalFilePath } from '../../../utils/path';
import { ListNoteSidebarItem } from './list-note-sidebar-item';
import { navigate } from 'wouter/use-browser-location';
import { useRoute } from 'wouter';
import { routeUrls, type SavedSearchRouteParams } from '../../../utils/routes';

export function NoteSidebarButton({
  sidebarNotePath,
  activeNotePath,
  sidebarNoteIndex,
}: {
  sidebarNotePath: LocalFilePath;
  activeNotePath: LocalFilePath | undefined;
  sidebarNoteIndex: number;
}) {
  const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
  const [isSavedSearchRoute, params] = useRoute<SavedSearchRouteParams>(
    routeUrls.patterns.SAVED_SEARCH
  );

  const setDraggedGhostElement = useSetAtom(draggedGhostElementAtom);

  const isActive = activeNotePath
    ? sidebarNotePath.equals(activeNotePath)
    : false;

  const isSelected =
    selectionRange.has(`note:${sidebarNotePath.note}`) ?? false;

  return (
    <button
      id={isActive ? 'selected-note-button' : undefined}
      type="button"
      title={sidebarNotePath.noteWithExtensionParam}
      draggable
      onKeyDown={(e) => handleKeyNavigation(e)}
      onDragStart={(e) =>
        handleNoteDragStart({
          e,
          setSelectionRange,
          draggedNote: sidebarNotePath.note,
          setDraggedGhostElement,
          folder: sidebarNotePath.folder,
        })
      }
      className={cn(
        'list-sidebar-item',
        sidebarNoteIndex === 0 && 'border-t',
        isActive && 'bg-zinc-150 dark:bg-zinc-700',
        isSelected && 'bg-(--accent-color)! text-white'
      )}
      onClick={(e) => {
        if (e.metaKey || e.shiftKey) return;
        const buttonElem = e.target as HTMLButtonElement;
        buttonElem.focus();
        if (isSavedSearchRoute) {
          navigate(
            `/saved-search/${params?.searchQuery}${sidebarNotePath.getLinkToNoteWithoutNotesPrefix()}`
          );
        } else {
          navigate(sidebarNotePath.getLinkToNote());
        }
      }}
    >
      <ListNoteSidebarItem
        sidebarNotePath={sidebarNotePath}
        activeNotePath={activeNotePath}
      />
    </button>
  );
}
