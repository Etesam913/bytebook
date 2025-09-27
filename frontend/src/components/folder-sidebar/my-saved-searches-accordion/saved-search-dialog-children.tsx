import { getDefaultButtonVariants } from '../../../animations';
import { MagnifierSlash } from '../../../icons/magnifier-slash';
import { MotionButton } from '../../buttons';

export function SavedSearchDialogChildren({
  searchesToDelete,
}: {
  searchesToDelete: Set<string>;
}) {
  const searchNames = Array.from(searchesToDelete)
    .filter((item) => item.startsWith('saved-search:'))
    .map((item) => item.replace('saved-search:', ''));

  return (
    <>
      <fieldset>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Are you sure you want to{' '}
          <span className="text-red-500">
            delete the{' '}
            {searchesToDelete.size > 1
              ? `${searchesToDelete.size} selected saved searches`
              : `"${searchNames[0] || 'this search'}"`}
            ?{' '}
          </span>{' '}
          {searchesToDelete.size > 1 ? 'These searches' : 'This search'} will be
          permanently removed.{' '}
        </p>
      </fieldset>
      <MotionButton
        type="submit"
        {...getDefaultButtonVariants()}
        className="w-[calc(100%-1.5rem)] mx-auto justify-center"
      >
        <MagnifierSlash />{' '}
        <span>Delete {searchesToDelete.size > 1 ? 'Searches' : 'Search'}</span>
      </MotionButton>
    </>
  );
}
