import { Fragment } from 'react';
import { motion } from 'motion/react';
import { Tag } from '../editor/bottom-bar/tag';
import { Folder } from '../../icons/folder';
import { Loader } from '../../icons/loader';
import { RenderNoteIcon } from '../../icons/render-note-icon';
import {
  useTagsForNotesQuery,
  useDeleteTagFromNoteMutation,
} from '../../hooks/tags';
import {
  FilePath,
  createFolderPath,
  safeDecodeURIComponent,
} from '../../utils/path';
import { cn } from '../../utils/string-formatting';
import { BreadcrumbItem } from './breadcrumb-item';

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
      <span className="flex min-w-0 items-center gap-1 overflow-hidden">
        {folderSegments.map((segment, index) => {
          const folderPath = createFolderPath(
            folderSegments.slice(0, index + 1).join('/')
          );
          if (!folderPath) {
            return null;
          }

          return (
            <Fragment key={`folder-segment-${index}`}>
              <BreadcrumbItem path={folderPath.encodedFolderUrl}>
                {index === 0 && <Folder width="1.125rem" height="1.125rem" />}
                {segment}
              </BreadcrumbItem>
              <span>/</span>
            </Fragment>
          );
        })}
        <BreadcrumbItem path={path}>
          <RenderNoteIcon filePath={filePath} />
          {safeDecodeURIComponent(filePath.noteWithoutExtension)}
        </BreadcrumbItem>
      </span>
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
          tags.map((tagName) => (
            <Tag
              key={tagName}
              tagName={tagName}
              className="shrink-0"
              onDelete={() => {
                deleteTagFromNote({ tagToDelete: tagName });
              }}
            />
          ))
        )}
      </span>
    </span>
  );
}
