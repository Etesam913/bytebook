import { getDefaultButtonVariants } from '@/animations';
import { BookBookmark } from '@/icons/book-bookmark';
import { MotionIconButton } from '@components/buttons';
import { Tooltip } from '@components/tooltip';
import { useSaveSearchDialog } from '@hooks/dialogs';

export function TreeFilterSummary({
  query,
  resultCount,
  isLoading,
}: {
  query: string;
  resultCount: number;
  isLoading: boolean;
}) {
  const openSaveSearchDialog = useSaveSearchDialog();

  if (!query.trim()) return null;

  return (
    <div className="pr-1 pl-3 flex items-center gap-2 mb-1">
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {!isLoading && (
          <span>
            {resultCount === 0
              ? '0 results found'
              : `${resultCount} ${resultCount === 1 ? 'result' : 'results'}`}
          </span>
        )}
      </p>
      <Tooltip content="Save search">
        <MotionIconButton
          {...getDefaultButtonVariants()}
          onClick={() => openSaveSearchDialog(query)}
          aria-label="Save search"
          className="ml-auto"
        >
          <BookBookmark width="0.875rem" height="0.875rem" />
        </MotionIconButton>
      </Tooltip>
    </div>
  );
}
