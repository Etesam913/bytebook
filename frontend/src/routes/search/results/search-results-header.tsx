import { getDefaultButtonVariants } from '../../../animations';
import { BookBookmark } from '../../../icons/book-bookmark';
import { MotionIconButton } from '../../../components/buttons';
import { useSaveSearchDialog } from '../../../hooks/dialogs';
import { Tooltip } from '../../../components/tooltip';

interface SearchResultsHeaderProps {
  searchQuery: string;
  resultCount: number;
}

export function SearchResultsHeader({
  searchQuery,
  resultCount,
}: SearchResultsHeaderProps) {
  const openSaveSearchDialog = useSaveSearchDialog();
  const trimmedQuery = searchQuery.trim();
  const resultLabel = resultCount === 1 ? 'result' : 'results';

  if (!trimmedQuery) {
    return null;
  }

  return (
    <div className="flex items-center justify-between text-sm gap-2 pl-2 pr-0.5 py-1">
      <span className="text-zinc-600 dark:text-zinc-400">
        {resultCount} {resultLabel} for{' '}
        <span className="font-code">{trimmedQuery}</span>
      </span>
      <Tooltip content="Save Search" placement="left">
        <MotionIconButton
          {...getDefaultButtonVariants()}
          onClick={() => openSaveSearchDialog(searchQuery)}
        >
          <BookBookmark height={20} width={20} />
        </MotionIconButton>
      </Tooltip>
    </div>
  );
}
