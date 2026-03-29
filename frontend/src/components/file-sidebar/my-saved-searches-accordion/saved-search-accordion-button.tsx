import { useAtom, useSetAtom } from 'jotai/react';
import {
  contextMenuDataAtom,
  dialogDataAtom,
  sidebarSelectionAtom,
} from '../../../atoms';
import { Magnifier } from '../../../icons/magnifier';
import {
  handleContextMenuSelection,
  type SetSelectionUpdater,
} from '../../../utils/selection';
import { cn } from '../../../utils/string-formatting';
import { navigate } from 'wouter/use-browser-location';
import { routeUrls } from '../../../utils/routes';
import { SavedSearch } from '../../../../bindings/github.com/etesam913/bytebook/internal/search/models';
import { MagnifierSlash } from '../../../icons/magnifier-slash';
import { SavedSearchDialogChildren } from './saved-search-dialog-children';
import { useDeleteSavedSearchMutation } from '../../../hooks/search';
import { Tooltip } from '../../tooltip';

export function SavedSearchAccordionButton({
  savedSearches,
  i,
  sidebarSearchName,
  isActive,
}: {
  savedSearches: SavedSearch[] | undefined;
  i: number;
  sidebarSearchName: string;
  isActive: boolean;
}) {
  const [sidebarSelection, setSidebarSelection] = useAtom(sidebarSelectionAtom);
  const selectionRange = sidebarSelection.selections;
  const setSelectionRange: SetSelectionUpdater = (updater) => {
    setSidebarSelection((prev) => ({
      ...prev,
      selections: updater(prev.selections),
    }));
  };
  const { mutateAsync: deleteSavedSearch } = useDeleteSavedSearchMutation();

  const isSelected =
    savedSearches?.at(i) &&
    selectionRange.has(`saved-search:${savedSearches[i].name}`);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const setDialogData = useSetAtom(dialogDataAtom);

  return (
    <Tooltip content={savedSearches?.at(i)?.query} placement="right">
      <button
        type="button"
        draggable
        onDragStart={(e) => e.preventDefault()}
        className={cn(
          'list-sidebar-item text-sm transition-none',
          isActive && 'bg-zinc-150 dark:bg-zinc-700',
          isSelected && 'bg-(--accent-color)! text-white'
        )}
        onClick={(e) => {
          if (e.metaKey || e.shiftKey) return;
          // Navigate to the saved search query
          const search = savedSearches?.at(i);
          if (search) {
            navigate(routeUrls.savedSearch(search.query));
          }
        }}
        onContextMenu={(e) => {
          const search = savedSearches?.at(i);
          const searchName = search ? search.name : sidebarSearchName;
          const newSelectionRange = handleContextMenuSelection({
            setSelectionRange,
            itemType: 'saved-search',
            itemName: searchName,
          });
          setContextMenuData({
            x: e.clientX,
            y: e.clientY,
            isShowing: true,
            items: [
              {
                label: (
                  <span className="flex items-center gap-1.5">
                    <MagnifierSlash width="1.125rem" height="1.125rem" />
                    Delete {newSelectionRange.size > 1 ? 'Searches' : 'Search'}
                  </span>
                ),
                value: 'delete-saved-search',
                onChange: () => {
                  setDialogData({
                    isOpen: true,
                    isPending: false,
                    title: `Delete ${newSelectionRange.size > 1 ? 'Saved Searches' : 'Saved Search'}`,
                    children: () => (
                      <SavedSearchDialogChildren
                        searchesToDelete={newSelectionRange}
                      />
                    ),
                    onSubmit: async () => {
                      // Delete the selected searches
                      const searchNames = Array.from(newSelectionRange)
                        .filter((item) => item.startsWith('saved-search:'))
                        .map((item) => item.replace('saved-search:', ''));

                      try {
                        // Delete each selected search
                        for (const searchName of searchNames) {
                          await deleteSavedSearch({ name: searchName });
                        }
                        return true;
                      } catch (error) {
                        console.error(
                          'Failed to delete saved searches:',
                          error
                        );
                        return false;
                      }
                    },
                  });
                },
              },
            ],
          });
        }}
      >
        <Magnifier
          height="0.875rem"
          width="0.875rem"
          className="will-change-transform"
        />
        <p className="whitespace-nowrap text-ellipsis overflow-hidden">
          {sidebarSearchName}
        </p>
      </button>
    </Tooltip>
  );
}
