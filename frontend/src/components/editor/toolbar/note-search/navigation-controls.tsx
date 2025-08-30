import { ArrowUp } from '../../../../icons/arrow-up';
import { ArrowDown } from '../../../../icons/arrow-down';

export function NavigationControls({
  searchValue,
  totalMatches,
  currentMatchIndex,
  onPreviousMatch,
  onNextMatch,
}: {
  searchValue: string;
  totalMatches: number;
  currentMatchIndex: number;
  onPreviousMatch: () => void;
  onNextMatch: () => void;
}) {
  return (
    <>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
        {totalMatches > 0
          ? `${currentMatchIndex}/${totalMatches}`
          : 'No matches'}
      </div>

      {/* {totalMatches > 0 && ( */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onPreviousMatch}
          title="Previous match (Shift+Enter)"
          disabled={totalMatches === 0}
          className="rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          tabIndex={0}
          aria-label="Previous match"
        >
          <ArrowUp
            width={10}
            height={10}
            className="text-zinc-600 dark:text-zinc-300"
          />
        </button>
        <button
          onClick={onNextMatch}
          title="Next match (Enter)"
          disabled={totalMatches === 0}
          className="rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          tabIndex={0}
          aria-label="Next match"
        >
          <ArrowDown
            width={10}
            height={10}
            className="text-zinc-600 dark:text-zinc-300"
          />
        </button>
      </div>
      {/* )} */}
    </>
  );
}
