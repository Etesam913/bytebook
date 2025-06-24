import { useEffect, useState } from 'react';
import { RouteFallback } from '../../components/route-fallback';
import {
  useCreateTagsMutation,
  useTagsForNotesQuery,
  useTagsQuery,
} from '../../hooks/tags';
import { extractInfoFromNoteName } from '../../utils/string-formatting';
import { IconButton, MotionButton } from '../../components/buttons';
import { getDefaultButtonVariants } from '../../animations';
import TagPlus from '../../icons/tag-plus';
import { DialogErrorText } from '../../components/dialog';
import { Checkbox } from '../../components/indeterminate-checkbox';
import { Input } from '../../components/input';
import { Tag } from '../../components/editor/bottom-bar/tag';
import { motion } from 'motion/react';
import { LoadingSpinner } from '../../components/loading-spinner';
import { useRoute } from 'wouter';

export function EditTagDialogChildren({
  selectionRange,
  folder,
  errorText,
}: {
  selectionRange: Set<string>;
  folder: string;
  errorText: string;
}) {
  const [isInTagsSidebar] = useRoute('/tags/:tagName/:folder?/:note?');
  const {
    data: tags,
    isLoading: areTagsLoading,
    isError: areTagsError,
    error: tagsError,
  } = useTagsQuery();

  // Getting the notes that were selected to open this dialog
  const selectedNotesWithExtensions = [...selectionRange]
    .filter((noteWithQueryParam) => noteWithQueryParam.startsWith('note:'))
    .map((noteWithQueryParam) => {
      const noteWithoutPrefix = noteWithQueryParam.split(':')[1];
      const { noteNameWithoutExtension, queryParams } =
        extractInfoFromNoteName(noteWithoutPrefix);
      return `${noteNameWithoutExtension}.${queryParams.ext}`;
    });

  // Track the counts of each tag for the notes that were selected to open this dialog
  const [selectedTagCounts, setSelectedTagCounts] = useState<
    Map<string, number>
  >(new Map());

  const { mutateAsync: createTags, isPending: isCreatingTags } =
    useCreateTagsMutation();

  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: tagsForSelectedNotes,
    isLoading: areTagsForSelectedNotesLoading,
    isError: areTagsForSelectedNotesError,
    error: tagsForSelectedNotesError,
  } = useTagsForNotesQuery(
    isInTagsSidebar
      ? selectedNotesWithExtensions
      : selectedNotesWithExtensions.map((note) => `${folder}/${note}`)
  );

  useEffect(() => {
    if (tagsForSelectedNotes) {
      const tagCounts = new Map<string, number>();

      Object.values(tagsForSelectedNotes).forEach((noteTags) => {
        noteTags.forEach((tag) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });

      setSelectedTagCounts(tagCounts);
    }
  }, [tagsForSelectedNotes]);

  const totalSelectedNotes = selectedNotesWithExtensions.length;

  // Filter tags based on search term and sort alphabetically
  const filteredTags =
    tags
      ?.filter((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.localeCompare(b)) || [];

  // Get fully selected tags from the notes that were selected to open this dialog
  const fullySelectedTags = Array.from(selectedTagCounts.entries())
    .filter(([, count]) => count > 0)
    .map(([tagName, count]) => ({
      tagName,
      count,
      isFullySelected: count === totalSelectedNotes && totalSelectedNotes > 0,
    }));

  // The onSubmit for the dialog needs to get data for all checkboxes that are
  // selected and not selected.
  const tagsToAddOrRemove = Array.from(selectedTagCounts.entries())
    .filter(([, count]) => count === 0 || count === totalSelectedNotes)
    .reduce(
      (acc, [tagName, count]) => ({
        tagNamesToRemove:
          count === 0
            ? [...acc.tagNamesToRemove, tagName]
            : acc.tagNamesToRemove,
        tagNamesToAdd:
          count === totalSelectedNotes
            ? [...acc.tagNamesToAdd, tagName]
            : acc.tagNamesToAdd,
      }),
      {
        tagNamesToRemove: [] as string[],
        tagNamesToAdd: [] as string[],
      }
    );

  const filteredTagElements = filteredTags.map((tag) => {
    const tagCount = selectedTagCounts.get(tag) || 0;
    const isFullySelected =
      tagCount === totalSelectedNotes && totalSelectedNotes > 0;
    const isIndeterminate = tagCount > 0 && tagCount < totalSelectedNotes;

    return (
      <label
        key={tag}
        className="flex items-center gap-2 py-0.5 px-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-750 rounded-md "
      >
        <Checkbox
          name="tags"
          value={tag}
          checked={isFullySelected}
          indeterminate={isIndeterminate}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedTagCounts(
                new Map(selectedTagCounts.set(tag, totalSelectedNotes))
              );
            } else {
              const newCounts = new Map(selectedTagCounts);
              newCounts.set(tag, 0);
              setSelectedTagCounts(newCounts);
            }
          }}
          className="h-3.5 w-3.5 border-gray-200 dark:border-zinc-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        />
        <span className="dark:text-zinc-200">{tag}</span>
      </label>
    );
  });

  return (
    <fieldset
      className="flex flex-col gap-2"
      data-tags-to-add-or-remove={JSON.stringify(tagsToAddOrRemove)}
    >
      <p>Select tags to add to or remove from {totalSelectedNotes} note(s) </p>
      {fullySelectedTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Selected tags
          </p>
          <motion.div layout className="flex flex-wrap gap-1.5">
            {fullySelectedTags.map(({ tagName, count, isFullySelected }) => (
              <motion.span layout key={tagName} className="relative text-sm">
                <Tag
                  tagName={tagName}
                  onClick={() => {
                    const newCounts = new Map(selectedTagCounts);
                    newCounts.delete(tagName);
                    setSelectedTagCounts(newCounts);
                  }}
                />
                {!isFullySelected && (
                  <span className="absolute -top-1 -right-1 bg-(--accent-color) text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {count}
                  </span>
                )}
              </motion.span>
            ))}
          </motion.div>
        </div>
      )}
      <div className="py-1.5">
        {(areTagsLoading || areTagsForSelectedNotesLoading) && (
          <RouteFallback className="my-1" />
        )}
        {tags && !areTagsLoading && !areTagsError && (
          <div className="mb-2">
            <Input
              labelProps={{}}
              inputProps={{
                autoFocus: true,
                placeholder: 'Search tags or create new tag...',
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value),
                className: 'text-sm',
                autoCapitalize: 'off',
                autoComplete: 'off',
                spellCheck: 'false',
                type: 'text',
              }}
              clearable={true}
            />
          </div>
        )}
        {tags && !areTagsLoading && !areTagsError && (
          <>
            <div className="h-64 overflow-y-auto space-y-1 p-1 border border-zinc-150 dark:border-zinc-650 rounded-md">
              {isCreatingTags && (
                <span className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 p-1.5">
                  <LoadingSpinner height={16} width={16} />{' '}
                  <span>Creating tag...</span>
                </span>
              )}
              {searchTerm.length > 0 &&
                !tags.includes(searchTerm.toLowerCase().trim()) && (
                  <IconButton
                    className="text-sm w-full flex items-center gap-2"
                    onClick={async () => {
                      // Create the tag and set its count to the total number of selected notes (every note will have it added)
                      await createTags({ tagNames: [searchTerm] });
                      setSelectedTagCounts(
                        new Map(
                          selectedTagCounts.set(searchTerm, totalSelectedNotes)
                        )
                      );
                      setSearchTerm('');
                    }}
                  >
                    <TagPlus height={18} width={18} /> Create tag &quot;
                    {searchTerm}&quot;
                  </IconButton>
                )}
              {filteredTagElements.length === 0 && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400 p-1.5">
                  No tags found
                </span>
              )}
              {filteredTagElements}
            </div>
          </>
        )}
      </div>
      {(areTagsError || areTagsForSelectedNotesError) && (
        <p className="text-red-500">
          {tagsError?.message || tagsForSelectedNotesError?.message}
        </p>
      )}
      <DialogErrorText errorText={errorText} />
      <MotionButton
        className="w-[calc(100%-4rem)] mx-auto text-center justify-center"
        type="submit"
        {...getDefaultButtonVariants()}
      >
        <span>Save</span>
        <TagPlus width={17} height={17} className="will-change-transform" />
      </MotionButton>
    </fieldset>
  );
}
