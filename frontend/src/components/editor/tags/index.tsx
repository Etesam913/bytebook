import { useState } from 'react';
import { Button } from 'react-aria-components/Button';
import {
  Disclosure,
  DisclosurePanel,
  Heading,
} from 'react-aria-components/Disclosure';
import { useAtomValue, useSetAtom } from 'jotai';
import { motion } from 'motion/react';
import { dialogDataAtom, isFileMaximizedAtom } from '../../../atoms';
import { ChevronDown } from '../../../icons/chevron-down';
import { Loader } from '../../../icons/loader';
import { TagPlus } from '../../../icons/tag-plus';
import {
  useDeleteTagFromNoteMutation,
  useEditTagsFormMutation,
  useTagsForNotesQuery,
} from '../../../hooks/tags';
import { EditTagDialogChildren } from '../../../routes/notes-sidebar/edit-tag-dialog-children';
import { FilePath } from '../../../utils/path';
import { cn } from '../../../utils/string-formatting';
import { Tag } from '../bottom-bar/tag';

export function Tags({ filePath }: { filePath: FilePath }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isFileMaximized = useAtomValue(isFileMaximizedAtom);
  const setDialogData = useSetAtom(dialogDataAtom);
  const { data: tagsMap, isLoading } = useTagsForNotesQuery([
    filePath.fullPath,
  ]);
  const { mutateAsync: editTags } = useEditTagsFormMutation();
  const { mutate: deleteTagFromNote } = useDeleteTagFromNoteMutation(
    filePath.fullPath
  );

  const tags = (tagsMap?.[`${filePath.folder}/${filePath.note}`] ?? []).sort();

  return (
    <section
      className={cn(
        'group mt-2 pt-1 border-t border-gray-200 dark:border-gray-600',
        isFileMaximized && 'px-3'
      )}
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
            <button
              type="button"
              className="flex whitespace-nowrap items-center gap-1.5 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-150 dark:hover:bg-zinc-600"
              onClick={() => {
                const selectionRange = new Set([`note:${filePath.note}`]);
                setDialogData({
                  isOpen: true,
                  isPending: false,
                  title: 'Edit Tags',
                  dialogClassName: 'w-[min(30rem,90vw)]',
                  children: (errorText) => (
                    <EditTagDialogChildren
                      selectionRange={selectionRange}
                      folder={filePath.folder}
                      errorText={errorText}
                    />
                  ),
                  onSubmit: async (formData, setErrorText) => {
                    return await editTags({
                      formData,
                      setErrorText,
                      selectionRange,
                      folder: filePath.folder,
                    });
                  },
                });
              }}
            >
              <TagPlus height="0.9375rem" width="0.9375rem" /> Edit Tags
            </button>
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
              tags.map((tagName) => (
                <Tag
                  key={tagName}
                  tagName={tagName}
                  onDelete={() => {
                    deleteTagFromNote({ tagToDelete: tagName });
                  }}
                />
              ))
            )}
          </div>
        </DisclosurePanel>
      </Disclosure>
    </section>
  );
}
