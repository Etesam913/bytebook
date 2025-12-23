import { Tag } from '../../../components/editor/bottom-bar/tag';
import { Dispatch, SetStateAction } from 'react';

export function SelectedTagsDisplay({
  selectedTagCounts,
  setSelectedTagCounts,
  totalSelectedNotes,
  setTagsCreatedButNotSaved,
}: {
  selectedTagCounts: Map<string, number>;
  setSelectedTagCounts: (
    action:
      | Map<string, number>
      | ((prev: Map<string, number>) => Map<string, number>)
  ) => void;
  totalSelectedNotes: number;
  setTagsCreatedButNotSaved: Dispatch<SetStateAction<string[]>>;
}) {
  const fullySelectedTags = Array.from(selectedTagCounts.entries())
    .filter(([, count]) => count > 0)
    .map(([tagName, count]) => ({
      tagName,
      count,
      isFullySelected: count === totalSelectedNotes && totalSelectedNotes > 0,
    }));

  if (fullySelectedTags.length === 0) {
    return null;
  }

  // Handler for removing tags from selected display
  const handleRemoveTag = (tagName: string) => {
    setSelectedTagCounts((prev) => {
      const next = new Map(prev);
      next.set(tagName, 0);
      return next;
    });
    setTagsCreatedButNotSaved((prev) => prev.filter((tag) => tag !== tagName));
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Selected tags:</p>
      <div className="flex flex-wrap gap-1.5">
        {fullySelectedTags.map(({ tagName, count, isFullySelected }) => (
          <span key={`tag-${tagName}`} className="relative text-sm">
            <Tag tagName={tagName} onDelete={() => handleRemoveTag(tagName)} />
            {!isFullySelected && (
              <span className="absolute -top-1 -right-1 bg-(--accent-color) text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {count}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
