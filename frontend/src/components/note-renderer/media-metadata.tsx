import { motion } from 'motion/react';
import { TagChips } from '@components/editor/bottom-bar/tag';
import { Folder } from '@/icons/folder';
import { Loader } from '@/icons/loader';
import { RenderNoteIcon } from '@/icons/render-note-icon';
import {
  useTagsForNotesQuery,
  useDeleteTagFromNoteMutation,
} from '@hooks/tags';
import {
  FilePath,
  createFolderPath,
  safeDecodeURIComponent,
} from '@utils/path';
import { cn } from '@utils/string-formatting';
import { BreadcrumbItem, BreadcrumbTrail } from './breadcrumb-item';

export function MediaMetadata({
  filePath,
  path,
  className,
}: {
  filePath: FilePath;
  path: string;
  className?: string;
}) {
  const { data: tagsMap, isLoading } = useTagsForNotesQuery([
    filePath.fullPath,
  ]);
  const { mutate: deleteTagFromNote } = useDeleteTagFromNoteMutation(
    filePath.fullPath
  );
  const notePath = `${filePath.folder}/${filePath.note}`;
  const folderSegments = filePath.folder
    .split('/')
    .filter(Boolean)
    .map((segment) => safeDecodeURIComponent(segment));
  const tags = (
    tagsMap?.[notePath] ??
    tagsMap?.[filePath.fullPath] ??
    []
  ).sort();

  return (
    <span className={cn('flex min-w-0 flex-1 items-center gap-3', className)}>
      <BreadcrumbTrail aria-label="Note location" className="overflow-hidden">
        {folderSegments.map((segment, index) => {
          const folderPath = createFolderPath(
            folderSegments.slice(0, index + 1).join('/')
          );
          if (!folderPath) {
            return null;
          }

          return (
            <BreadcrumbItem
              key={`folder-segment-${index}`}
              path={folderPath.encodedFolderUrl}
            >
              {index === 0 && <Folder width="1.125rem" height="1.125rem" />}
              {segment}
            </BreadcrumbItem>
          );
        })}
        <BreadcrumbItem path={path}>
          <RenderNoteIcon filePath={filePath} />
          {safeDecodeURIComponent(filePath.noteWithoutExtension)}
        </BreadcrumbItem>
      </BreadcrumbTrail>
      <span
        className="flex min-w-0 items-center gap-1.5 overflow-auto"
        style={{ scrollbarWidth: 'thin' }}
      >
        {isLoading ? (
          <motion.span
            className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-300"
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
            listClassName="flex-nowrap"
            onRemove={(tagToDelete) => deleteTagFromNote({ tagToDelete })}
          />
        )}
      </span>
    </span>
  );
}
