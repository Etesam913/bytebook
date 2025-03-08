import { getDefaultButtonVariants } from '../../animations';
import TagSlash from '../../icons/tag-slash';
import { getTagNameFromSetValue } from '../../utils/string-formatting';
import { MotionButton } from '../buttons';

export function TagDialogChildren({
  tagsToDelete,
}: {
  tagsToDelete: Set<string>;
}) {
  return (
    <>
      <fieldset>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Are you sure you want to{' '}
          <span className="text-red-500">
            delete{' '}
            {tagsToDelete.size > 1
              ? `the selected
						${tagsToDelete.size} tags`
              : `"${getTagNameFromSetValue(Array.from(tagsToDelete.keys())[0])}"`}
            ?{' '}
          </span>{' '}
          {tagsToDelete.size > 1 ? 'These tags' : 'This tag'} will be removed
          from all notes.{' '}
        </p>
      </fieldset>
      <MotionButton
        type="submit"
        {...getDefaultButtonVariants()}
        className="w-[calc(100%-1.5rem)] mx-auto justify-center"
      >
        <TagSlash />{' '}
        <span>Delete {tagsToDelete.size > 1 ? 'Tags' : 'Tag'}</span>
      </MotionButton>
    </>
  );
}
