import { SettingsRow } from './settings-row';
import { MotionButton } from '@components/buttons';
import { getDefaultButtonVariants } from '@/animations';
import { useRegenerateSearchIndexMutation } from '@hooks/search';
import { SearchContent2 } from '@/icons/search-content-2';
import { Loader } from '@/icons/loader';
import { cn } from '@utils/string-formatting';
import { Tooltip } from '@components/tooltip';

export function SearchPage() {
  const { mutate: regenerateSearchIndex, isPending } =
    useRegenerateSearchIndexMutation();

  return (
    <SettingsRow
      title="Search Index"
      description="Regenerate the search index to manually update search results."
      isFirst
    >
      <div>
        <Tooltip
          content={
            isPending
              ? 'Regenerating search index...'
              : 'Regenerate search index'
          }
          showWhenDisabled={isPending}
        >
          <MotionButton
            className={cn(
              'text-center w-44',
              isPending && 'flex items-center justify-center'
            )}
            {...getDefaultButtonVariants()}
            isDisabled={isPending}
            onClick={() => {
              regenerateSearchIndex();
            }}
          >
            {isPending ? (
              <Loader width="1.4375rem" height="1.4375rem" />
            ) : (
              <>
                <SearchContent2 width="1.25rem" height="1.25rem" />
                Regenerate Index
              </>
            )}
          </MotionButton>
        </Tooltip>
      </div>
    </SettingsRow>
  );
}
