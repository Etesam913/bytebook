import { SearchExcerpt } from '@components/search-excerpt';
import { MenuOption } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import type { JSX } from 'react';
import { mergeProps } from 'react-aria/mergeProps';
import { useHover } from 'react-aria/useHover';
import { usePress } from 'react-aria/usePress';
import { cn } from '@utils/string-formatting';
import type { FilePath } from '@utils/path';

export class TypeaheadOption extends MenuOption {
  // What shows up in the editor
  title: string;
  // Icon for display
  icon?: JSX.Element;
  // For extra searching.
  keywords: Array<string>;
  // What happens when you select this option?
  onSelect: (queryString: string) => void;

  constructor(
    title: string,
    options: {
      icon?: JSX.Element;
      keywords?: Array<string>;
      onSelect: (queryString: string) => void;
    }
  ) {
    super(title);
    this.title = title;
    this.keywords = options.keywords || [];
    this.icon = options.icon;
    this.onSelect = options.onSelect.bind(this);
  }
}

function useTypeaheadOptionProps({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: TypeaheadOption;
}) {
  const { pressProps } = usePress({ onPress: onClick });
  const { hoverProps } = useHover({ onHoverStart: onMouseEnter });
  return {
    ...mergeProps(pressProps, hoverProps),
    ref: (element: HTMLLIElement | null) => option.setRefElement(element),
    role: 'option' as const,
    'aria-selected': isSelected,
    id: `typeahead-item-${index}`,
  };
}

export function ComponentPickerMenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: TypeaheadOption;
}) {
  const iconElement = option.icon;
  const optionTitle = option.title;
  // Lexical keeps focus in the editor while rows handle press and hover.
  const optionProps = useTypeaheadOptionProps({
    index,
    isSelected,
    onClick,
    onMouseEnter,
    option,
  });

  return (
    <li
      {...optionProps}
      className={cn(
        'flex items-center gap-2 text-left rounded-md px-1.75 py-0.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-650',
        isSelected &&
          'bg-(--accent-color) text-white hover:bg-(--accent-color) dark:hover:bg-(--accent-color)'
      )}
    >
      {iconElement && <span aria-hidden="true">{iconElement}</span>}
      <span className="text">{optionTitle}</span>
    </li>
  );
}

export type FilePickerMenuItemData =
  | {
      kind: 'file';
      filePath: FilePath;
    }
  | {
      kind: 'folder';
      folder: string;
    };

export function FilePickerMenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
  item,
  highlightHtml,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: TypeaheadOption;
  item: FilePickerMenuItemData;
  highlightHtml?: string;
}) {
  const iconElement = option.icon;
  const ariaLabel =
    item.kind === 'file'
      ? `${item.filePath.note} in ${item.filePath.folder} folder`
      : `${item.folder} folder`;
  const primaryText = item.kind === 'file' ? item.filePath.note : item.folder;
  const secondaryText =
    item.kind === 'file' ? `${item.filePath.folder}/` : 'Folder';
  const optionProps = useTypeaheadOptionProps({
    index,
    isSelected,
    onClick,
    onMouseEnter,
    option,
  });

  return (
    <li
      {...optionProps}
      className={cn(
        'rounded-md px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-650',
        isSelected &&
          'bg-zinc-150 dark:bg-zinc-600 hover:bg-zinc-150 dark:hover:bg-zinc-600'
      )}
      aria-label={ariaLabel}
    >
      <div className="flex items-start gap-1">
        {iconElement && (
          <span aria-hidden="true" className="mt-0.5 shrink-0">
            {iconElement}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm leading-5">
            {primaryText}
          </span>
          <p
            className="block truncate text-xs leading-4 text-zinc-500 dark:text-zinc-400"
            aria-hidden="true"
          >
            {secondaryText}
          </p>
          {highlightHtml && (
            <div className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-0.5 whitespace-normal break-words">
              <SearchExcerpt html={highlightHtml} />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
