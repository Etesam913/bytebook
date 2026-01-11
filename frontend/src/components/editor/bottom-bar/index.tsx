import { useEffect, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { motion } from 'motion/react';
import { Tag } from './tag';
import { BreadcrumbItem } from './breadcrumb-item';
import { KernelHeartbeats } from './kernel-heartbeats';
import { TagPlus } from '../../../icons/tag-plus';
import { Folder } from '../../../icons/folder';
import { Loader } from '../../../icons/loader';
import {
  useEditTagsFormMutation,
  useTagsForNotesQuery,
  // useDeleteTagsMutation,
} from '../../../hooks/tags';
import { dialogDataAtom, isNoteMaximizedAtom } from '../../../atoms';
import { EditTagDialogChildren } from '../../../routes/notes-sidebar/edit-tag-dialog-children';
import { timeSince } from '../utils/bottom-bar';
import { RenderNoteIcon } from '../../../icons/render-note-icon';
import { Frontmatter } from '../../../types';
import { cn } from '../../../utils/string-formatting';
import { FilePath, safeDecodeURIComponent } from '../../../utils/path';

export function BottomBar({
  frontmatter,
  filePath,
  isNoteEditor,
}: {
  frontmatter?: Frontmatter;
  filePath: FilePath;
  isNoteEditor?: boolean;
}) {
  const [lastUpdatedText, setLastUpdatedText] = useState('');
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);

  const { data: tagsMap, isLoading } = useTagsForNotesQuery([
    filePath.toString(),
  ]);
  const { mutateAsync: editTags } = useEditTagsFormMutation();
  // const { mutateAsync: deleteTagFromNote } = useDeleteTagFromNoteMutation(filePath);
  const setDialogData = useSetAtom(dialogDataAtom);

  useEffect(() => {
    if (!frontmatter) return;
    const doesFrontmatterHaveLastUpdated = 'lastUpdated' in frontmatter;
    if (!doesFrontmatterHaveLastUpdated) {
      return;
    }
    const interval = setInterval(() => {
      setLastUpdatedText(
        timeSince(new Date(frontmatter.lastUpdated!), new Date())
      );
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [frontmatter]);

  const tagElements = (tagsMap?.[`${filePath.folder}/${filePath.note}`] ?? [])
    .sort()
    .map((tagName) => {
      return (
        <Tag
          key={tagName}
          tagName={tagName}
          // onDelete={() => {
          //   deleteTagFromNote({
          //     tagToDelete: tagName,
          //   });
          // }}
        />
      );
    });

  return (
    <footer
      className={cn(
        'text-xs ml-[-4.5px] border-t border-gray-200 dark:border-gray-600 py-1.5 pl-2 pr-5 flex items-center gap-4',
        isNoteMaximized && 'px-5'
      )}
    >
      <span className="flex items-center gap-1">
        <BreadcrumbItem to={`/${filePath.folder}`}>
          <Folder width={20} height={20} />{' '}
          {safeDecodeURIComponent(filePath.folder)}
        </BreadcrumbItem>{' '}
        /{' '}
        <BreadcrumbItem to={filePath.fileUrl}>
          <RenderNoteIcon filePath={filePath} />
          {safeDecodeURIComponent(filePath.noteWithoutExtension)}
        </BreadcrumbItem>
      </span>
      {isNoteEditor && <KernelHeartbeats />}
      <span className="flex items-center gap-2 overflow-auto scrollbar-hidden">
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
              onSubmit: async (e, setErrorText) => {
                return await editTags({
                  e,
                  setErrorText,
                  selectionRange,
                  folder: filePath.folder,
                });
              },
            });
          }}
        >
          <TagPlus height={15} width={15} /> Edit Tags
        </button>
        {isLoading ? (
          <motion.span
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Loader height={14} width={14} />
            Loading Tags
          </motion.span>
        ) : (
          tagElements
        )}
      </span>
      {lastUpdatedText.length > 0 && (
        <p className="text-zinc-500 dark:text-zinc-300 whitespace-nowrap text-ellipsis ml-auto">
          Last Updated: {' ' + lastUpdatedText} ago
        </p>
      )}
    </footer>
  );
}
