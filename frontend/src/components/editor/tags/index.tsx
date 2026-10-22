import { useState } from 'react';
import { Button } from 'react-aria-components/Button';
import {
  Disclosure,
  DisclosurePanel,
  Heading,
} from 'react-aria-components/Disclosure';
import { motion } from 'motion/react';
import { ChevronDown } from '@/icons/chevron-down';
import { Loader } from '@/icons/loader';
import { TagPlus } from '@/icons/tag-plus';
import {
  useDeleteTagFromNoteMutation,
  useTagsForNotesQuery,
} from '@hooks/tags';
import { useOpenEditTagsDialog } from '@hooks/dialogs';
import { FilePath } from '@utils/path';
import { cn } from '@utils/string-formatting';
import { TagChips } from '../bottom-bar/tag';

export function Tags({ filePath }: { filePath: FilePath }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: tagsMap, isLoading } = useTagsForNotesQuery([
    filePath.fullPath,
  ]);
  const openEditTagsDialog = useOpenEditTagsDialog();
  const { mutate: deleteTagFromNote } = useDeleteTagFromNoteMutation(
    filePath.fullPath
  );

  const tags = [...(tagsMap?.[filePath.fullPath] ?? [])].sort();

  return (
    <section
      data-testid="note-tags"
      className="group mt-2 pt-1 border-t border-gray-200 dark:border-gray-600"
    >
      <Disclosure isExpanded={isExpanded} onExpandedChange={setIsExpanded}>
        <Heading className="m-0 text-xs">
          <Button
            slot="trigger"
            className={cn(
              'flex w-full items-center gap-1.5 py-1.5 text-zinc-500 dark:text-zinc-300',
              'hover:text-zinc-700 dark:hover:text-zinc-100'
            )}
          >
            <span
              className={cn(
                'flex will-change-transform motion-safe:transition-transform motion-safe:duration-200',
                isExpanded ? 'rotate-0' : '-rotate-90'
              )}
            >
              <ChevronDown width={12} height={12} strokeWidth={2.5} />
            </span>
            <span>
              Tags
              {!isLoading && ` (${tags.length})`}
            </span>
          </Button>
        </Heading>
        <DisclosurePanel className="h-(--disclosure-panel-height) overflow-clip text-xs motion-safe:transition-[height] motion-safe:duration-200">
          <div className="flex flex-wrap items-center gap-1.5 pb-1.5 pl-5 pr-3">
            <Button
              className="flex whitespace-nowrap items-center gap-1.5 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-150 dark:hover:bg-zinc-600 outline-none focus-visible:ring-2 focus-visible:ring-(--accent-color)"
              onPress={() => openEditTagsDialog([filePath.fullPath])}
            >
              <TagPlus height="0.9375rem" width="0.9375rem" /> Edit Tags
            </Button>
            {isLoading ? (
              <motion.span
                className="flex items-center gap-2 text-zinc-500 dark:text-zinc-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Loader height="0.875rem" width="0.875rem" />
                Loading Tags
              </motion.span>
            ) : (
              <TagChips
                aria-label="Note tags"
                tags={tags}
                onRemove={(tagToDelete) => deleteTagFromNote({ tagToDelete })}
              />
            )}
          </div>
        </DisclosurePanel>
      </Disclosure>
    </section>
  );
}
