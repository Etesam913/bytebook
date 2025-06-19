import { useEffect, useState } from 'react';
import { RouteFallback } from '../../components/route-fallback';
import { useTagsForNotesQuery, useTagsQuery } from '../../hooks/tag-events';
import { extractInfoFromNoteName } from '../../utils/string-formatting';
import { MotionButton } from '../../components/buttons';
import { getDefaultButtonVariants } from '../../animations';
import TagPlus from '../../icons/tag-plus';
import { DialogErrorText } from '../../components/dialog';
import { Checkbox } from '../../components/indeterminate-checkbox';
import { Input } from '../../components/input';

export function EditTagDialogChildren({
  selectionRange,
  folder,
  errorText,
}: {
  selectionRange: Set<string>;
  folder: string;
  errorText: string;
}) {
  const {
    data: tags,
    isLoading: areTagsLoading,
    isError: areTagsError,
    error: tagsError,
  } = useTagsQuery();

  const selectedNotesWithExtensions = [...selectionRange]
    .filter((noteWithQueryParam) => noteWithQueryParam.startsWith('note:'))
    .map((noteWithQueryParam) => {
      const noteWithoutPrefix = noteWithQueryParam.split(':')[1];
      const { noteNameWithoutExtension, queryParams } =
        extractInfoFromNoteName(noteWithoutPrefix);
      return `${noteNameWithoutExtension}.${queryParams.ext}`;
    });

  const [selectedTagCounts, setSelectedTagCounts] = useState<
    Map<string, number>
  >(new Map());

  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: tagsForSelectedNotes,
    isLoading: areTagsForSelectedNotesLoading,
    isError: areTagsForSelectedNotesError,
    error: tagsForSelectedNotesError,
  } = useTagsForNotesQuery(folder, selectedNotesWithExtensions);

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

  // Filter tags based on search term
  const filteredTags =
    tags?.filter((tag) =>
      tag.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <fieldset className="flex flex-col gap-2">
      <p>Select tags to add or remove from {totalSelectedNotes} note(s) </p>
      <div className="py-1.5">
        {(areTagsLoading || areTagsForSelectedNotesLoading) && (
          <RouteFallback className="my-1" />
        )}
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Your tags</p>
        {tags && !areTagsLoading && !areTagsError && tags.length > 0 && (
          <div className="mb-2">
            <Input
              labelProps={{}}
              inputProps={{
                placeholder: 'Search tags...',
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value),
                className: 'text-sm',
              }}
              clearable={true}
            />
          </div>
        )}
        {tags && !areTagsLoading && !areTagsError && (
          <>
            {tags.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-750 border border-zinc-150 dark:border-zinc-650 rounded-md">
                <p>No tags found.</p>
              </div>
            ) : (
              <div className="h-64 overflow-y-auto space-y-1 p-1 border border-zinc-150 dark:border-zinc-650 rounded-md">
                {filteredTags.map((tag) => {
                  const tagCount = selectedTagCounts.get(tag) || 0;
                  const isFullySelected =
                    tagCount === totalSelectedNotes && totalSelectedNotes > 0;
                  const isIndeterminate =
                    tagCount > 0 && tagCount < totalSelectedNotes;

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
                              new Map(
                                selectedTagCounts.set(tag, totalSelectedNotes)
                              )
                            );
                          } else {
                            const newCounts = new Map(selectedTagCounts);
                            newCounts.delete(tag);
                            setSelectedTagCounts(newCounts);
                          }
                        }}
                        className="h-3.5 w-3.5 border-gray-200 dark:border-zinc-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                      />
                      <span className="dark:text-zinc-200">{tag}</span>
                    </label>
                  );
                })}
              </div>
            )}
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
