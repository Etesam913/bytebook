import { IconButton } from '../../../components/buttons';
import { Checkbox } from '../../../components/indeterminate-checkbox';
import TagPlus from '../../../icons/tag-plus';

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

  // Handler for tag selection changes
  const handleTagSelectionChange = (tagName: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTagCounts((prev) => {
        const next = new Map(prev);
        next.set(tagName, totalSelectedNotes);
        return next;
      });
    } else {
      setSelectedTagCounts((prev) => {
        const next = new Map(prev);
        next.set(tagName, 0);
        return next;
      });
    }
  };

  const tagElements = displayedTags.map((tag) => {
    const tagCount = selectedTagCounts.get(tag) || 0;
    const isFullySelected =
      tagCount === totalSelectedNotes && totalSelectedNotes > 0;
    const isIndeterminate = tagCount > 0 && tagCount < totalSelectedNotes;

    // Create accessible label describing the state
    const getAriaLabel = () => {
      if (isIndeterminate) {
        return `${tag} tag, partially selected (${tagCount} of ${totalSelectedNotes} notes)`;
      }
      if (isFullySelected) {
        return `${tag} tag, selected`;
      }
      return `${tag} tag, not selected`;
    };

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
          onChange={(e) => handleTagSelectionChange(tag, e.target.checked)}
          className="h-3.5 w-3.5 border-gray-200 dark:border-zinc-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
          tabIndex={0}
          aria-label={getAriaLabel()}
        />
        <span className="dark:text-zinc-200" aria-hidden="true">
          {tag}
        </span>
      </label>
    );
  });

  return (
    <div className="h-64 overflow-y-auto space-y-1 p-1 border border-zinc-150 dark:border-zinc-650 rounded-md">
      {showCreateButton && (
        <IconButton
          className="text-sm w-full flex items-center gap-2"
          onClick={() => {
            onCreateTag(searchTerm);
          }}
          tabIndex={0}
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
