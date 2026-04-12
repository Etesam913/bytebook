import { ListBox, ListBoxItem } from 'react-aria-components';
import { AppIconButton } from '../../../components/buttons';
import { AppCheckbox } from '../../../components/checkbox';
import { cn } from '../../../utils/string-formatting';
import { TagPlus } from '../../../icons/tag-plus';
import type { Key, Selection } from 'react-aria-components';

/**
 * Scrollable multi-select list of tags shown in the Edit Tags dialog. A tag
 * is considered selected when every currently-selected note has it;
 * otherwise its checkbox is rendered in an indeterminate state. When the
 * search term doesn't match any existing tag, a "Create tag" row appears at
 * the top.
 */
export function TagSelectionList({
  displayedTags,
  selectedTagCounts,
  totalSelectedNotes,
  searchTerm,
  setSelectedTagCounts,
  onCreateTag,
}: {
  displayedTags: string[];
  selectedTagCounts: Map<string, number>;
  totalSelectedNotes: number;
  searchTerm: string;
  setSelectedTagCounts: (
    action:
      | Map<string, number>
      | ((prev: Map<string, number>) => Map<string, number>)
  ) => void;
  onCreateTag: (tagName: string) => void;
}) {
  const showCreateButton =
    searchTerm.length > 0 &&
    !displayedTags.includes(searchTerm.toLowerCase().trim());

  // Derive selectedKeys from selectedTagCounts: only fully-selected tags
  const selectedKeys = new Set<Key>(
    displayedTags.filter((tag) => {
      const count = selectedTagCounts.get(tag) || 0;
      return count === totalSelectedNotes && totalSelectedNotes > 0;
    })
  );

  /**
   * Maps a ListBox selection change to tag count updates: newly-selected tags
   * get bumped to `totalSelectedNotes` (fully applied), newly-deselected tags
   * drop to 0 (fully removed). Tags whose membership didn't change in this
   * event are left untouched so partial selections aren't clobbered.
   */
  function handleSelectionChange(keys: Selection) {
    // keys is either "all" or a Set<Key>
    const newSelected = keys === 'all' ? new Set(displayedTags) : keys;

    setSelectedTagCounts((prev) => {
      const next = new Map(prev);
      for (const tag of displayedTags) {
        const wasSelected = selectedKeys.has(tag);
        const isNowSelected = newSelected.has(tag);
        if (wasSelected !== isNowSelected) {
          next.set(tag, isNowSelected ? totalSelectedNotes : 0);
        }
      }
      return next;
    });
  }

  return (
    <div className="h-64 overflow-y-auto space-y-1 p-1 border border-zinc-150 dark:border-zinc-650 rounded-md">
      {showCreateButton && (
        <AppIconButton
          className="text-sm w-full flex items-center gap-2"
          onClick={() => {
            onCreateTag(searchTerm);
          }}
        >
          <TagPlus height="1.125rem" width="1.125rem" /> Create tag &quot;
          {searchTerm}&quot;
        </AppIconButton>
      )}
      {displayedTags.length === 0 && !showCreateButton && (
        <span className="text-sm text-zinc-500 dark:text-zinc-400 p-1.5">
          No tags found
        </span>
      )}
      {displayedTags.length > 0 && (
        <ListBox
          aria-label="Tags"
          selectionMode="multiple"
          selectedKeys={selectedKeys}
          onSelectionChange={handleSelectionChange}
          items={displayedTags.map((tag) => ({ id: tag, name: tag }))}
          className="outline-hidden"
        >
          {(item) => {
            const tagCount = selectedTagCounts.get(item.name) || 0;
            const isFullySelected =
              tagCount === totalSelectedNotes && totalSelectedNotes > 0;
            const isIndeterminate =
              tagCount > 0 && tagCount < totalSelectedNotes;

            /**
             * Builds the screen-reader label describing the tag's selection
             * state (fully selected, partially selected with count, or
             * unselected).
             */
            const getAriaLabel = () => {
              if (isIndeterminate) {
                return `${item.name} tag, partially selected (${tagCount} of ${totalSelectedNotes} notes)`;
              }
              if (isFullySelected) {
                return `${item.name} tag, selected`;
              }
              return `${item.name} tag, not selected`;
            };

            return (
              <ListBoxItem
                id={item.id}
                textValue={item.name}
                aria-label={getAriaLabel()}
                className={({ isFocused }) =>
                  cn(
                    'flex items-center gap-2 py-0.5 px-1.5 rounded-md outline-hidden',
                    isFocused && 'bg-zinc-100 dark:bg-zinc-750'
                  )
                }
              >
                <AppCheckbox
                  name="tags"
                  value={item.name}
                  isSelected={isFullySelected}
                  isIndeterminate={isIndeterminate}
                  onChange={() => {}}
                  className="pointer-events-none"
                  aria-hidden="true"
                />
                <span className="dark:text-zinc-200" aria-hidden="true">
                  {item.name}
                </span>
              </ListBoxItem>
            );
          }}
        </ListBox>
      )}
    </div>
  );
}
