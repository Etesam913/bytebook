import { useAtom, useAtomValue, useSetAtom } from 'jotai/react';
import {
  contextMenuDataAtom,
  dialogDataAtom,
  selectionRangeAtom,
} from '../../../atoms';
import { useDeleteTagsMutation } from '../../../hooks/tags';
import { TagIcon } from '../../../icons/tag';
import TagSlash from '../../../icons/tag-slash';
import { handleContextMenuSelection } from '../../../utils/selection';
import {
  cn,
  getTagNameFromSelectionRange,
} from '../../../utils/string-formatting';
import { navigate } from 'wouter/use-browser-location';
import { routeUrls } from '../../../utils/routes';
import { currentZoomAtom } from '../../../hooks/resize';
import { TagDialogChildren } from '../tag-dialog-children';

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
  const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
  const { mutateAsync: deleteTags } = useDeleteTagsMutation();

  const isSelected = tags?.at(i) && selectionRange.has(`tag:${tags[i]}`);
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
        navigate(routeUrls.tagSearch(sidebarTagName));
      }}
      onContextMenu={(e) => {
        const newSelectionRange = handleContextMenuSelection({
          setSelectionRange,
          itemType: 'tag',
          itemName: sidebarTagName,
        });
        setContextMenuData({
          x: e.clientX / currentZoom,
          y: e.clientY / currentZoom,
          isShowing: true,
          items: [
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <TagSlash /> Delete{' '}
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
      <TagIcon height={16} width={16} strokeWidth={1.75} />
      <p className="whitespace-nowrap text-ellipsis overflow-hidden">
        {sidebarTagName}{' '}
        {/* {tagPreviewCount !== undefined && (
          <span className="tracking-wider">({tagPreviewCount})</span>
        )} */}
      </p>
    </button>
  );
}