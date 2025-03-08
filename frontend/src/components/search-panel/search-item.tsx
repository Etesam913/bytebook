import { useAtom } from 'jotai';
import { forwardRef } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { searchPanelDataAtom } from '../../atoms';
import { Folder } from '../../icons/folder';
import { Note } from '../../icons/page';
import { cn, getFileExtension } from '../../utils/string-formatting';

export const SearchItem = forwardRef<
  HTMLLIElement,
  { i: number; filePath: string }
>(({ i, filePath }, ref) => {
  const [searchPanelData, setSearchPanelData] = useAtom(searchPanelDataAtom);
  const [folder, note] = filePath.split('/');

  return (
    <li
      ref={ref}
      className={cn(
        'relative hover:bg-zinc-100 dark:hover:bg-zinc-750 rounded-md',
        searchPanelData.focusedIndex === i && 'bg-zinc-200 dark:bg-zinc-700'
      )}
    >
      <button
        tabIndex={-1}
        onClick={() => {
          const [folder, note] = filePath.split('/');
          const { extension, fileName } = getFileExtension(note);
          setSearchPanelData((prev) => ({ ...prev, isOpen: false }));
          navigate(`/${folder}/${fileName}?ext=${extension}&focus=true`);
        }}
        type="button"
        className="relative flex items-center will-change-transform z-40 w-full text-left px-1.5 py-[0.225rem]"
      >
        <Folder width={16} height={16} className="mr-1.5 min-w-4 min-h-4" />{' '}
        <p className="whitespace-nowrap">{folder}</p>
        /
        <Note width={16} height={16} className="mx-1 min-w-4 min-h-4" />
        <p className="overflow-hidden whitespace-nowrap text-ellipsis">
          {note}
        </p>
      </button>
    </li>
  );
});

SearchItem.displayName = 'SearchItem';
