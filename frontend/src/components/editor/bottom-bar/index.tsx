import { Fragment, useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { KernelHeartbeats } from './kernel-heartbeats';
import { Folder } from '../../../icons/folder';
import { isFileMaximizedAtom } from '../../../atoms';
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
      {lastUpdatedText.length > 0 && (
        <p className="text-zinc-500 dark:text-zinc-300 whitespace-nowrap text-ellipsis ml-auto">
          Last Updated: {' ' + lastUpdatedText} ago
        </p>
      )}
    </footer>
  );
}
