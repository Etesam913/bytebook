import { ArrowUp } from '../../../../icons/arrow-up';
import { ArrowDown } from '../../../../icons/arrow-down';

export function NavigationControls({
  totalMatches,
  currentMatchIndex,
  onPreviousMatch,
  onNextMatch,
}: {
  totalMatches: number;
  currentMatchIndex: number;
  onPreviousMatch: () => void;
  onNextMatch: () => void;
}) {
  return (
    <>
      <div className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
        {totalMatches > 0
          ? `${currentMatchIndex}/${totalMatches}`
          : 'No matches'}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onPreviousMatch}
          title="Previous match (Shift+Enter)"
          disabled={totalMatches === 0}
          className="rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-zinc-900 hover:dark:text-zinc-100"
          tabIndex={0}
          aria-label="Previous match"
        >
          <ArrowUp width={16} height={16} />
        </button>
        <button
          onClick={onNextMatch}
          title="Next match (Enter)"
          disabled={totalMatches === 0}
          className="rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-zinc-900 hover:dark:text-zinc-100"
          tabIndex={0}
          aria-label="Next match"
        >
          <ArrowDown width={16} height={16} />
        </button>
      </div>
    </>
  );
}
