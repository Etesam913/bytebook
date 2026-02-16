import { Fragment, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Tag } from '../editor/bottom-bar/tag';
import { Folder } from '../../icons/folder';
import { Loader } from '../../icons/loader';
import { RenderNoteIcon } from '../../icons/render-note-icon';
import { useTagsForNotesQuery } from '../../hooks/tags';
import { FilePath, safeDecodeURIComponent } from '../../utils/path';
import { cn } from '../../utils/string-formatting';

function BreadcrumbItem({ children }: { children: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-1 whitespace-nowrap text-ellipsis overflow-hidden text-zinc-500 dark:text-zinc-300 shrink-0">
      {children}
    </span>
  );
}

export function MediaMetadata({
  filePath,
  className,
}: {
  filePath: FilePath;
  className?: string;
}) {
  const { data: tagsMap, isLoading } = useTagsForNotesQuery([
    filePath.fullPath,
  ]);
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
        {folderSegments.map((segment, index) => (
          <Fragment key={`folder-segment-${index}`}>
            <BreadcrumbItem>
              {index === 0 && <Folder width={18} height={18} />}
              {segment}
            </BreadcrumbItem>
            <span>/</span>
          </Fragment>
        ))}
        <BreadcrumbItem>
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
            <Loader height={14} width={14} />
            Loading Tags
          </motion.span>
        ) : (
          tags.map((tagName) => (
            <Tag key={tagName} tagName={tagName} className="shrink-0" />
          ))
        )}
      </span>
    </span>
  );
}
