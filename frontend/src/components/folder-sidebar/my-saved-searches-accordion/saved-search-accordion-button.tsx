import { useAtom, useAtomValue, useSetAtom } from 'jotai/react';
import {
  contextMenuDataAtom,
  dialogDataAtom,
  selectionRangeAtom,
} from '../../../atoms';
import { Magnifier } from '../../../icons/magnifier';
import { handleContextMenuSelection } from '../../../utils/selection';
import { cn } from '../../../utils/string-formatting';
import { navigate } from 'wouter/use-browser-location';
import { routeUrls } from '../../../utils/routes';
import { currentZoomAtom } from '../../../hooks/resize';

export function SavedSearchAccordionButton({
  savedSearches,
  i,
  sidebarSearchName,
  isActive,
}: {
  savedSearches: string[] | undefined;
  i: number;
  sidebarSearchName: string;
  isActive: boolean;
}) {
  const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);

  const isSelected =
    savedSearches?.at(i) &&
    selectionRange.has(`saved-search:${savedSearches[i]}`);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const setDialogData = useSetAtom(dialogDataAtom);
  const currentZoom = useAtomValue(currentZoomAtom);

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => e.preventDefault()}
      className={cn(
        'list-sidebar-item',
        isActive && 'bg-zinc-150 dark:bg-zinc-700',
        isSelected && 'bg-(--accent-color)! text-white'
      )}
      onClick={(e) => {
        if (e.metaKey || e.shiftKey) return;
        // TODO: Implement navigation to saved search when backend is ready
        navigate(routeUrls.savedSearch(sidebarSearchName));
      }}
      onContextMenu={(e) => {
        const newSelectionRange = handleContextMenuSelection({
          setSelectionRange,
          itemType: 'saved-search',
          itemName: sidebarSearchName,
        });
        setContextMenuData({
          x: e.clientX / currentZoom,
          y: e.clientY / currentZoom,
          isShowing: true,
          items: [
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Magnifier width={16} height={16} />
                  Delete{' '}
                  {newSelectionRange.size > 1
                    ? 'Saved Searches'
                    : 'Saved Search'}
                </span>
              ),
              value: 'delete-saved-search',
              onChange: () => {
                // TODO: Implement delete functionality when backend is ready
                setDialogData({
                  isOpen: true,
                  isPending: false,
                  title: `Delete ${newSelectionRange.size > 1 ? 'Saved Searches' : 'Saved Search'}`,
                  children: () => (
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">
                      Delete functionality will be implemented when saved
                      searches backend is ready.
                    </div>
                  ),
                  onSubmit: async () => {
                    // TODO: Implement delete mutation when backend is ready
                    return Promise.resolve(true);
                  },
                });
              },
            },
          ],
        });
      }}
    >
      <Magnifier height={16} width={16} />
      <p className="whitespace-nowrap text-ellipsis overflow-hidden">
        {sidebarSearchName}
      </p>
    </button>
  );
}
