import { ReactNode } from 'react';
import { Link } from 'wouter';
import { cn } from '../../../utils/string-formatting';
import { Folder } from '../../../icons/folder';
import { ImageIcon } from '../../../icons/image';
import { Note } from '../../../icons/page';

function getFileIcon(iconType: 'note' | 'attachment' | 'folder') {
  switch (iconType) {
    case 'note':
      return <Note className="min-w-5 w-5" />;
    case 'attachment':
      return <ImageIcon className="min-w-5 w-5" />;
    case 'folder':
      return <Folder className="min-w-5" height={20} width={20} />;
  }
}

export function SearchResultItem({
  to,
  title,
  iconType,
  resultIndex,
  selectedIndex,
  onRef,
  pathDisplay,
  children,
}: {
  to: string;
  title: string;
  iconType: 'note' | 'attachment' | 'folder';
  resultIndex: number;
  selectedIndex: number;
  onRef: (el: HTMLAnchorElement | null) => void;
  pathDisplay?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      to={to}
      draggable={false}
      ref={onRef}
      className={cn(
        'flex flex-col gap-y-1 py-2 px-2 w-full hover:bg-zinc-100 dark:hover:bg-zinc-650 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-650 focus-visible:outline-2 focus-visible:outline-sky-500 break-all',
        resultIndex === selectedIndex && 'bg-zinc-150 dark:bg-zinc-700'
      )}
    >
      <h3 className="font-semibold flex items-center gap-x-1.5">
        {getFileIcon(iconType)} {title}
      </h3>
      {pathDisplay && (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {pathDisplay}
        </span>
      )}
      {children}
    </Link>
  );
}
