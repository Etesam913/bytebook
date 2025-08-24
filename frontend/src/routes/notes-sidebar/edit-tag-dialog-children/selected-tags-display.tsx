import { motion } from 'motion/react';
import { Tag } from '../../../components/editor/bottom-bar/tag';

export function SelectedTagsDisplay({
  selectedTags,
  onRemoveTag,
}: {
  selectedTags: {
    tagName: string;
    count: number;
    isFullySelected: boolean;
  }[];
  onRemoveTag: (tagName: string) => void;
}) {
  if (selectedTags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Selected tags:</p>
      <motion.div layout className="flex flex-wrap gap-1.5">
        {selectedTags.map(({ tagName, count, isFullySelected }) => (
          <motion.span layout key={tagName} className="relative text-sm">
            <Tag tagName={tagName} onClick={() => onRemoveTag(tagName)} />
            {!isFullySelected && (
              <span className="absolute -top-1 -right-1 bg-(--accent-color) text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {count}
              </span>
            )}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}
