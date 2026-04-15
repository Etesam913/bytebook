import { useAtom, useSetAtom } from 'jotai/react';
import {
  contextMenuDataAtom,
  dialogDataAtom,
  sidebarSelectionAtom,
} from '../../../atoms';
import { useDeleteTagsMutation } from '../../../hooks/tags';
import { TagIcon } from '../../../icons/tag';
import { TagSlash } from '../../../icons/tag-slash';
import {
  handleContextMenuSelection,
  type SetSelectionUpdater,
} from '../../../utils/selection';
import {
  cn,
  getTagNameFromSelectionRange,
} from '../../../utils/string-formatting';
import { navigate } from 'wouter/use-browser-location';
import { routeUrls } from '../../../utils/routes';
import { TagDialogChildren } from './tag-dialog-children';

export function TagAccordionButton({
  tags,
  i,
  sidebarTagName,
  isActive,
}: {
  tags: string[] | undefined;
  i: number;
  sidebarTagName: string;
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
  const { mutateAsync: deleteTags } = useDeleteTagsMutation();

  const isSelected = tags?.at(i) && selectionRange.has(`tag:${tags[i]}`);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const setDialogData = useSetAtom(dialogDataAtom);

  return (
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
        navigate(routeUrls.tagSearch(sidebarTagName));
      }}
      onContextMenu={(e) => {
        const newSelectionRange = handleContextMenuSelection({
          setSelectionRange,
          itemType: 'tag',
          itemName: sidebarTagName,
        });
        setContextMenuData({
          x: e.clientX,
          y: e.clientY,
          isShowing: true,
          targetId: null,
          items: [
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <TagSlash width="1rem" height="1rem" /> Delete{' '}
                  {newSelectionRange.size > 1 ? 'Tags' : 'Tag'}
                </span>
              ),
              value: 'delete-tag',
              onChange: () => {
                const tagsToDelete = Array.from(newSelectionRange).map((tag) =>
                  getTagNameFromSelectionRange(tag)
                );
                setDialogData({
                  isOpen: true,
                  isPending: false,
                  title: `Delete ${newSelectionRange.size > 1 ? 'Tags' : 'Tag'}`,
                  children: () => (
                    <TagDialogChildren tagsToDelete={newSelectionRange} />
                  ),
                  onSubmit: async (_, setErrorText) => {
                    return deleteTags({ tagsToDelete, setErrorText });
                  },
                });
              },
            },
          ],
        });
      }}
    >
      <TagIcon
        height="1rem"
        width="1rem"
        strokeWidth={1.75}
        className="will-change-transform"
      />
      <p className="whitespace-nowrap text-ellipsis overflow-hidden">
        {sidebarTagName}{' '}
        {/* {tagPreviewCount !== undefined && (
          <span className="tracking-wider">({tagPreviewCount})</span>
        )} */}
      </p>
    </button>
  );
}
