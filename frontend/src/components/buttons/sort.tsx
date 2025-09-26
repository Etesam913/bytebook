import { type Dispatch, type SetStateAction, useRef, useState, useId } from 'react';
import { MotionIconButton } from '.';
import { getDefaultButtonVariants } from '../../animations';
import { useOnClickOutside } from '../../hooks/general';
import { Paperclip } from '../../icons/paperclip-2';
import SortAlphaAscending from '../../icons/sort-alpha-ascending';
import SortAlphaDescending from '../../icons/sort-alpha-descending';
import SortDateAscending from '../../icons/sort-date-ascending';
import { SortDateDescending } from '../../icons/sort-date-descending';
import { SortNumAscending } from '../../icons/sort-num-ascending';
import SortNumDescending from '../../icons/sort-num-descending';
import type { SortStrings } from '../../types';
import { cn } from '../../utils/string-formatting';
import { DropdownItems } from '../dropdown/dropdown-items';

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
      return (
        <SortDateDescending className="pointer-events-none will-change-transform" />
      );
    case 'date-updated-asc':
      return (
        <SortDateAscending className="pointer-events-none will-change-transform" />
      );
    case 'date-created-desc':
      return (
        <SortDateDescending className="pointer-events-none will-change-transform" />
      );
    case 'date-created-asc':
      return (
        <SortDateAscending className="pointer-events-none will-change-transform" />
      );
    case 'file-name-a-z':
      return (
        <SortAlphaAscending className="pointer-events-none will-change-transform" />
      );
    case 'file-name-z-a':
      return (
        <SortAlphaDescending className="pointer-events-none will-change-transform" />
      );
    case 'size-desc':
      return (
        <SortNumDescending className="pointer-events-none will-change-transform" />
      );
    case 'size-asc':
      return <SortNumAscending className="pointer-events-none" />;
    case 'file-type':
      return (
        <Paperclip className="pointer-events-none will-change-transform" />
      );
  }
}

export function SortButton({
  sortDirection,
  setSortDirection,
}: {
  sortDirection: SortStrings;
  setSortDirection: Dispatch<SetStateAction<SortStrings>>;
}) {
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const [isSortOptionsOpen, setIsSortOptionsOpen] = useState(false);
  useOnClickOutside(dropdownContainerRef, () => setIsSortOptionsOpen(false));
  const [focusIndex, setFocusIndex] = useState(
    sortOptions.findIndex(({ value }) => value === sortDirection)
  );
  
  const uniqueId = useId();
  const buttonId = `sort-button-${uniqueId}`;
  const menuId = `sort-menu-${uniqueId}`;

  const sortOptionComponents = sortOptions.map(({ name, value }) => {
    return {
      value,
      label: (
        <div
          key={value}
          className="flex items-center gap-1.5 will-change-transform"
        >
          <IconForSortOption sortOption={value} />
          {name}
        </div>
      ),
    };
  });

  return (
    <div className="relative flex" ref={dropdownContainerRef}>
      <DropdownItems
        className="w-fit translate-y-[2.25rem] right-0 "
        isOpen={isSortOptionsOpen}
        setIsOpen={setIsSortOptionsOpen}
        setFocusIndex={setFocusIndex}
        focusIndex={focusIndex}
        items={sortOptionComponents}
        selectedItem={sortDirection}
        onChange={({ value }) => setSortDirection(value as SortStrings)}
        menuId={menuId}
        buttonId={buttonId}
        valueIndex={sortOptions.findIndex(({ value }) => value === sortDirection)}
      />

      <MotionIconButton
        id={buttonId}
        onClick={() => setIsSortOptionsOpen((prev) => !prev)}
        {...getDefaultButtonVariants()}
        title={sortOptions.find(({ value }) => value === sortDirection)?.name}
        aria-label="Sort options"
        aria-haspopup="listbox"
        aria-expanded={isSortOptionsOpen}
        aria-controls={isSortOptionsOpen ? menuId : undefined}
        type="button"
        className={cn(isSortOptionsOpen && 'bg-zinc-100 dark:bg-zinc-700')}
      >
        <IconForSortOption sortOption={sortDirection} />
      </MotionIconButton>
    </div>
  );
}
