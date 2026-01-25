import { type Dispatch, type SetStateAction, useState } from 'react';
import { MotionIconButton } from '.';
import { getDefaultButtonVariants } from '../../animations';
import { Paperclip } from '../../icons/paperclip-2';
import SortAlphaAscending from '../../icons/sort-alpha-ascending';
import SortAlphaDescending from '../../icons/sort-alpha-descending';
import { SortDateAscending } from '../../icons/sort-date-ascending';
import { SortDateDescending } from '../../icons/sort-date-descending';
import { SortNumAscending } from '../../icons/sort-num-ascending';
import SortNumDescending from '../../icons/sort-num-descending';
import type { SortStrings } from '../../types';
import { cn } from '../../utils/string-formatting';
import { DropdownMenu } from '../dropdown/dropdown-menu';
import { Tooltip } from '../tooltip';

const sortOptions: { name: string; value: SortStrings }[] = [
  { name: 'Date Updated (desc)', value: 'date-updated-desc' },
  { name: 'Date Updated (asc)', value: 'date-updated-asc' },
  { name: 'Date Created (desc)', value: 'date-created-desc' },
  { name: 'Date Created (asc)', value: 'date-created-asc' },
  { name: 'File Name (A-Z)', value: 'file-name-a-z' },
  { name: 'File Name (Z-A)', value: 'file-name-z-a' },
  { name: 'Size (desc)', value: 'size-desc' },
  { name: 'Size (asc)', value: 'size-asc' },
  { name: 'File Type', value: 'file-type' },
];

function IconForSortOption({ sortOption }: { sortOption: SortStrings }) {
  switch (sortOption) {
    case 'date-updated-desc':
      return <SortDateDescending className="pointer-events-none" />;
    case 'date-updated-asc':
      return <SortDateAscending className="pointer-events-none" />;
    case 'date-created-desc':
      return <SortDateDescending className="pointer-events-none" />;
    case 'date-created-asc':
      return <SortDateAscending className="pointer-events-none" />;
    case 'file-name-a-z':
      return <SortAlphaAscending className="pointer-events-none" />;
    case 'file-name-z-a':
      return <SortAlphaDescending className="pointer-events-none" />;
    case 'size-desc':
      return <SortNumDescending className="pointer-events-none" />;
    case 'size-asc':
      return <SortNumAscending className="pointer-events-none" />;
    case 'file-type':
      return <Paperclip className="pointer-events-none" />;
  }
}

export function SortButton({
  sortDirection,
  setSortDirection,
}: {
  sortDirection: SortStrings;
  setSortDirection: Dispatch<SetStateAction<SortStrings>>;
}) {
  const [isSortOptionsOpen, setIsSortOptionsOpen] = useState(false);

  const sortOptionComponents = sortOptions.map(({ name, value }) => {
    return {
      value,
      label: (
        <div key={value} className="flex items-center gap-1.5">
          <IconForSortOption sortOption={value} />
          {name}
        </div>
      ),
    };
  });

  return (
    <DropdownMenu
      items={sortOptionComponents}
      isOpen={isSortOptionsOpen}
      setIsOpen={setIsSortOptionsOpen}
      className="relative flex"
      dropdownClassName="w-fit translate-y-[2.25rem] right-0"
      selectedItem={sortDirection}
      valueIndex={sortOptions.findIndex(({ value }) => value === sortDirection)}
      onChange={({ value }) => setSortDirection(value as SortStrings)}
    >
      {({ buttonId, menuId, isOpen, handleKeyDown, handleClick }) => (
        <Tooltip content="Sort options" placement="right">
          <MotionIconButton
            id={buttonId}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            {...getDefaultButtonVariants()}
            title={
              sortOptions.find(({ value }) => value === sortDirection)?.name
            }
            aria-label="Sort options"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={isOpen ? menuId : undefined}
            type="button"
            className={cn(isOpen && 'bg-zinc-100 dark:bg-zinc-700')}
          >
            <IconForSortOption sortOption={sortDirection} />
          </MotionIconButton>
        </Tooltip>
      )}
    </DropdownMenu>
  );
}
