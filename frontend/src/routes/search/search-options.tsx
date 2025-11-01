import { useState } from 'react';
import { getDefaultButtonVariants } from '../../animations';
import { BookBookmark } from '../../icons/book-bookmark';
import { HorizontalDots } from '../../icons/horizontal-dots';
import { SearchContent2 } from '../../icons/search-content-2';
import { MotionIconButton } from '../../components/buttons';
import { useSaveSearchDialog } from '../../hooks/dialogs';
import { useRegenerateSearchIndexMutation } from '../../hooks/search';
import { Tooltip } from '../../components/tooltip';
import { DropdownMenu } from '../../components/dropdown/dropdown-menu';
import { isFullscreenAtom } from '../../atoms';
import { useAtomValue } from 'jotai';
import { cn } from '../../utils/string-formatting';

interface SearchOptionsProps {
  searchQuery: string;
}

export function SearchOptions({ searchQuery }: SearchOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const openSaveSearchDialog = useSaveSearchDialog();
  const { mutate: regenerateSearchIndex } = useRegenerateSearchIndexMutation();
  const trimmedQuery = searchQuery.trim();
  const isFullscreen = useAtomValue(isFullscreenAtom);

  const items = [
    ...(trimmedQuery
      ? [
          {
            value: 'save-search',
            label: (
              <span className="flex items-center gap-1.5 will-change-transform">
                <BookBookmark width={20} height={20} /> Save Search
              </span>
            ),
          },
        ]
      : []),
    {
      value: 'search-content',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <SearchContent2 width={20} height={20} /> Regenerate Index
        </span>
      ),
    },
  ];

  return (
    <DropdownMenu
      items={items}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      className="ml-auto flex flex-col"
      dropdownClassName="w-48 right-4 top-12"
      onChange={async (item) => {
        switch (item.value) {
          case 'search-content': {
            regenerateSearchIndex();
            break;
          }
          case 'save-search': {
            openSaveSearchDialog(searchQuery);
            break;
          }
        }
      }}
    >
      {({ buttonId, menuId, isOpen, handleKeyDown, handleClick }) => (
        <Tooltip content="Search options" placement="left">
          <MotionIconButton
            id={buttonId}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={isOpen ? menuId : undefined}
            aria-label="Search options"
            className={cn(!isFullscreen && 'rounded-tr-2xl')}
            {...getDefaultButtonVariants()}
          >
            <HorizontalDots width={20} height={20} />
          </MotionIconButton>
        </Tooltip>
      )}
    </DropdownMenu>
  );
}
