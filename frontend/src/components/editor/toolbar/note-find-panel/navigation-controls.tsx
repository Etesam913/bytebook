import { ArrowUp } from '@/icons/arrow-up';
import { ArrowDown } from '@/icons/arrow-down';
import { AppIconButton } from '@components/buttons';
import { Tooltip } from '@components/tooltip';

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
        <Tooltip
          content="Previous match"
          shortcut="Shift+Enter"
          delay={{ open: 50 }}
          showWhenDisabled={totalMatches === 0}
        >
          <AppIconButton
            onPress={onPreviousMatch}
            isDisabled={totalMatches === 0}
            className="p-0.5 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 hover:text-zinc-900 hover:dark:text-zinc-100"
            aria-label="Previous match"
          >
            <ArrowUp width="1rem" height="1rem" />
          </AppIconButton>
        </Tooltip>
        <Tooltip
          content="Next match"
          shortcut="Enter"
          delay={{ open: 50 }}
          showWhenDisabled={totalMatches === 0}
        >
          <AppIconButton
            onPress={onNextMatch}
            isDisabled={totalMatches === 0}
            className="p-0.5 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 hover:text-zinc-900 hover:dark:text-zinc-100"
            aria-label="Next match"
          >
            <ArrowDown width="1rem" height="1rem" />
          </AppIconButton>
        </Tooltip>
      </div>
    </>
  );
}
