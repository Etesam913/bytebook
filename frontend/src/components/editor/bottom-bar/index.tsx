import { Fragment, useEffect, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { motion } from 'motion/react';
import { Tag } from './tag';
import { KernelHeartbeats } from './kernel-heartbeats';
import { TagPlus } from '../../../icons/tag-plus';
import { Folder } from '../../../icons/folder';
import { Loader } from '../../../icons/loader';
import {
  useEditTagsFormMutation,
  useTagsForNotesQuery,
  useDeleteTagFromNoteMutation,
} from '../../../hooks/tags';
import { dialogDataAtom, isFileMaximizedAtom } from '../../../atoms';
import { EditTagDialogChildren } from '../../../routes/notes-sidebar/edit-tag-dialog-children';
import { timeSince } from '../utils/bottom-bar';
import { RenderNoteIcon } from '../../../icons/render-note-icon';
import { Frontmatter } from '../../../types';
import { cn } from '../../../utils/string-formatting';
import {
  FilePath,
  createFolderPath,
  safeDecodeURIComponent,
} from '../../../utils/path';
import { BreadcrumbItem } from '../../note-renderer/breadcrumb-item';

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
  const isFileMaximized = useAtomValue(isFileMaximizedAtom);

  const { data: tagsMap, isLoading } = useTagsForNotesQuery([
    filePath.fullPath,
  ]);
  const { mutateAsync: editTags } = useEditTagsFormMutation();
  const { mutate: deleteTagFromNote } = useDeleteTagFromNoteMutation(
    filePath.fullPath
  );
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
          onDelete={() => {
            deleteTagFromNote({ tagToDelete: tagName });
          }}
        />
      );
    });
  const folderSegments = filePath.folder
    .split('/')
    .filter(Boolean)
    .map((segment) => safeDecodeURIComponent(segment));

  return (
    <footer
      className={cn(
        'text-xs ml-[-4.5px] border-t border-gray-200 dark:border-gray-600 py-1.5 pl-2 pr-5 flex items-center gap-4',
        isFileMaximized && 'px-5'
      )}
    >
      <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-300">
        {folderSegments.map((segment, index) => {
          const path = folderSegments.slice(0, index + 1).join('/');
          const folderPath = createFolderPath(path);
          if (!folderPath) {
            return null;
          }

          return (
            <Fragment key={`folder-segment-${index}`}>
              <BreadcrumbItem path={folderPath.encodedFolderUrl}>
                {index === 0 && <Folder width="1rem" height="1rem" />}
                {segment}
              </BreadcrumbItem>
              <span>/</span>
            </Fragment>
          );
        })}
        <BreadcrumbItem path={filePath.encodedFileUrl}>
          <RenderNoteIcon filePath={filePath} size="sm" />
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
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Loader height="0.875rem" width="0.875rem" />
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
