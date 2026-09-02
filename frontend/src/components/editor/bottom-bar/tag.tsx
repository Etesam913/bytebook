import type { ReactNode } from 'react';
import { Button } from 'react-aria-components/Button';
import {
  Tag,
  TagGroup,
  type TagGroupProps,
  TagList,
} from 'react-aria-components/TagGroup';
import { cn } from '@utils/string-formatting';
import { Xmark } from '@/icons/xmark';

/** Keyboard-navigable chip list. Pass onRemove to show remove buttons and enable Backspace/Delete. */
export function TagChips({
  tags,
  onRemove,
  listClassName,
  renderBadge,
  ...props
}: Omit<TagGroupProps, 'children' | 'onRemove'> & {
  tags: string[];
  onRemove?: (tagName: string) => void;
  listClassName?: string;
  renderBadge?: (tagName: string) => ReactNode;
}) {
  return (
    <TagGroup
      {...props}
      onRemove={
        onRemove
          ? (keys) => keys.forEach((key) => onRemove(String(key)))
          : undefined
      }
    >
      <TagList
        items={tags.map((id) => ({ id }))}
        className={cn('flex flex-wrap gap-1.5', listClassName)}
      >
        {(item) => (
          <Tag
            id={item.id}
            textValue={item.id}
            className={({ isFocusVisible }) =>
              cn(
                'relative flex shrink-0 items-center gap-1.5 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-600 whitespace-nowrap outline-none',
                isFocusVisible && 'ring-2 ring-(--accent-color)'
              )
            }
          >
            {({ allowsRemoving }) => (
              <>
                <p>{item.id}</p>
                {allowsRemoving && (
                  <Button
                    slot="remove"
                    aria-label={`Remove tag ${item.id}`}
                    className="flex items-center outline-none rounded-full focus-visible:ring-2 focus-visible:ring-(--accent-color)"
                  >
                    <Xmark width="0.75rem" height="0.75rem" />
                  </Button>
                )}
                {renderBadge?.(item.id)}
              </>
            )}
          </Tag>
        )}
      </TagList>
    </TagGroup>
  );
}
