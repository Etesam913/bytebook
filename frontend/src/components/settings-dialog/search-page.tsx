import { SettingsRow } from './settings-row';
import { MotionButton } from '../buttons';
import { getDefaultButtonVariants } from '../../animations';
import { useRegenerateSearchIndexMutation } from '../../hooks/search';
import { SearchContent2 } from '../../icons/search-content-2';
import { Loader } from '../../icons/loader';
import { cn } from '../../utils/string-formatting';

export function SearchPage() {
  const { mutate: regenerateSearchIndex, isPending } =
    useRegenerateSearchIndexMutation();

  return (
    <>
      <SettingsRow
        title="Search Index"
        description="Regenerate the search index to manually update search results."
        isFirst
      >
        <div>
          <MotionButton
            className={cn(
              'text-center w-44',
              isPending && 'flex items-center justify-center'
            )}
            {...getDefaultButtonVariants()}
            disabled={isPending}
            onClick={() => {
              regenerateSearchIndex();
            }}
          >
            {isPending ? (
              <Loader width={23} height={23} />
            ) : (
              <>
                <SearchContent2 width={20} height={20} />
                Regenerate Index
              </>
            )}
          </MotionButton>
        </div>
      </SettingsRow>
    </>
  );
}
