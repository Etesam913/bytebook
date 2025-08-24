import { IconButton } from '../../../components/buttons';
import { Checkbox } from '../../../components/indeterminate-checkbox';
import TagPlus from '../../../icons/tag-plus';

export function TagSelectionList({
  filteredTags,
  selectedTagCounts,
  totalSelectedNotes,
  searchTerm,
  onTagSelectionChange,
  onCreateTag,
}: {
  filteredTags: string[];
  selectedTagCounts: Map<string, number>;
  totalSelectedNotes: number;
  searchTerm: string;
  onTagSelectionChange: (tagName: string, isSelected: boolean) => void;
  onCreateTag: (tagName: string) => Promise<void>;
}) {
  const showCreateButton =
    searchTerm.length > 0 &&
    !filteredTags.includes(searchTerm.toLowerCase().trim());

  const tagElements = filteredTags.map((tag) => {
    const tagCount = selectedTagCounts.get(tag) || 0;
    const isFullySelected =
      tagCount === totalSelectedNotes && totalSelectedNotes > 0;
    const isIndeterminate = tagCount > 0 && tagCount < totalSelectedNotes;

    return (
      <label
        key={tag}
        className="flex items-center gap-2 py-0.5 px-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-750 rounded-md"
      >
        <Checkbox
          name="tags"
          value={tag}
          checked={isFullySelected}
          indeterminate={isIndeterminate}
          onChange={(e) => onTagSelectionChange(tag, e.target.checked)}
          className="h-3.5 w-3.5 border-gray-200 dark:border-zinc-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        />
        <span className="dark:text-zinc-200">{tag}</span>
      </label>
    );
  });

  return (
    <div className="h-64 overflow-y-auto space-y-1 p-1 border border-zinc-150 dark:border-zinc-650 rounded-md">
      {showCreateButton && (
        <IconButton
          className="text-sm w-full flex items-center gap-2"
          onClick={async () => {
            await onCreateTag(searchTerm);
          }}
        >
          <TagPlus height={18} width={18} /> Create tag &quot;
          {searchTerm}&quot;
        </IconButton>
      )}
      {tagElements.length === 0 && !showCreateButton && (
        <span className="text-sm text-zinc-500 dark:text-zinc-400 p-1.5">
          No tags found
        </span>
      )}
      {tagElements}
    </div>
  );
}
