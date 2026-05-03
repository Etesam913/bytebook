import { useState } from 'react';
import {
  Button,
  Disclosure,
  DisclosurePanel,
  Heading,
} from 'react-aria-components';
import { Virtuoso } from 'react-virtuoso';
import { Link } from 'wouter';
import { ChevronDown } from '../../../icons/chevron-down';
import { Folder } from '../../../icons/folder';
import { Loader } from '../../../icons/loader';
import { RenderNoteIcon } from '../../../icons/render-note-icon';
import {
  type FilePath,
  createFilePath,
  safeDecodeURIComponent,
} from '../../../utils/path';
import { cn } from '../../../utils/string-formatting';
import { useLinkedMentionsQuery } from '../hooks/linked-mentions';
import { TriangleWarning } from '../../../icons/triangle-warning';

export function LinkedMentions({ filePath }: { filePath: FilePath }) {
  const { data, isLoading, isError } = useLinkedMentionsQuery(filePath);
  const mentions = data ?? [];
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="group mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
      <Disclosure isExpanded={isExpanded} onExpandedChange={setIsExpanded}>
        <Heading className="m-0 text-xs">
          <Button
            slot="trigger"
            className={cn(
              'flex w-full items-center gap-1.5 py-2 text-zinc-500 dark:text-zinc-300',
              'hover:text-zinc-700 dark:hover:text-zinc-100'
            )}
          >
            <span
              className={cn(
                'flex will-change-transform motion-safe:transition-transform motion-safe:duration-200',
                isExpanded ? 'rotate-0' : '-rotate-90'
              )}
            >
              <ChevronDown width="0.75rem" height="0.75rem" strokeWidth="2.5" />
            </span>
            <span>
              Linked mentions
              {!isLoading && ` (${mentions.length})`}
            </span>
          </Button>
        </Heading>
        <DisclosurePanel className="h-(--disclosure-panel-height) overflow-clip text-xs motion-safe:transition-[height] motion-safe:duration-200">
          {isError && (
            <p className="flex items-center gap-1.5 py-2 pl-5 text-red-500 dark:text-red-400">
              <TriangleWarning width="0.875rem" height="0.875rem" />
              Failed to load linked mentions
            </p>
          )}
          {isLoading ? (
            <div className="flex items-center gap-2 py-2 pl-5 text-zinc-500 dark:text-zinc-300">
              <Loader width="0.875rem" height="0.875rem" /> Loading
            </div>
          ) : mentions.length === 0 ? (
            <section className="py-2 pl-5 gap-2 flex flex-col text-zinc-500 dark:text-zinc-300">
              <p>Notes that link to this note are shown here.</p>
              <p>
                Use the &quot;@&quot; symbol in a note to link to a different
                note.
              </p>
            </section>
          ) : (
            <Virtuoso
              style={{ height: Math.min(mentions.length * 32, 312) }}
              totalCount={mentions.length}
              data={mentions}
              computeItemKey={(_, mention) =>
                `${mention.folder ? `${mention.folder}/` : ''}${mention.note}`
              }
              itemContent={(_, mention) => {
                const mentionPath = createFilePath(
                  `${mention.folder ? `${mention.folder}/` : ''}${mention.note}`
                );
                if (!mentionPath) {
                  return null;
                }
                const folderSegments = mentionPath.folder
                  .split('/')
                  .filter(Boolean)
                  .map((segment) => safeDecodeURIComponent(segment));
                const folderPathLabel = folderSegments.join(' / ');

                return (
                  <Link
                    to={mentionPath.encodedFileUrl}
                    className="group/mention flex w-fit min-w-0 items-center gap-1 py-1.5 pl-5 pr-3 overflow-hidden rounded-md text-zinc-800 hover:text-(--accent-color) dark:text-zinc-200"
                  >
                    {folderPathLabel && (
                      <span className="flex min-w-0 shrink items-center gap-1 text-zinc-500 group-hover/mention:text-(--accent-color) dark:text-zinc-300">
                        <Folder
                          width="0.875rem"
                          height="0.875rem"
                          className="shrink-0"
                        />
                        <span className="truncate whitespace-nowrap">
                          {folderPathLabel}
                        </span>
                        <span className="shrink-0">/</span>
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                      <RenderNoteIcon filePath={mentionPath} size="sm" />
                      <span className="truncate whitespace-nowrap">
                        {safeDecodeURIComponent(mentionPath.note)}
                      </span>
                    </span>
                  </Link>
                );
              }}
            />
          )}
        </DisclosurePanel>
      </Disclosure>
    </section>
  );
}
