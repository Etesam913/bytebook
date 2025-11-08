import { useState } from 'react';
import { RouteFallback } from '../../../components/route-fallback';
import { useTagsForNotesQuery, useTagsQuery } from '../../../hooks/tags';
import { FilePath } from '../../../utils/string-formatting';
import { MotionButton } from '../../../components/buttons';
import { getDefaultButtonVariants } from '../../../animations';
import TagPlus from '../../../icons/tag-plus';
import { DialogErrorText } from '../../../components/dialog';
import { TagSearchInput } from './tag-search-input';
import { SelectedTagsDisplay } from './selected-tags-display';
import { TagSelectionList } from './tag-selection-list';

export function EditTagDialogChildren({
  selectionRange,
  folder,
  errorText,
}: {
  selectionRange: Set<string>;
  folder: string;
  errorText: string;
}) {
  const [tagsCreatedButNotSaved, setTagsCreatedButNotSaved] = useState<
    string[]
  >([]);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: allTags,
    isLoading: areTagsLoading,
    isError: areTagsError,
    error: tagsError,
  } = useTagsQuery();

  // Getting the notes that were selected to open this dialog
  const selectedFilePaths = [...selectionRange]
    .filter((selectionRangeEntry) => selectionRangeEntry.startsWith('note:'))
    .map((selectionRangeEntry) => {
      const note = selectionRangeEntry.split(':')[1];
      return new FilePath({ folder, note });
    });

  const totalSelectedNotes = selectedFilePaths.length;

  const {
    data: tagsForSelectedNotes,
    isLoading: areTagsForSelectedNotesLoading,
    isError: areTagsForSelectedNotesError,
    error: tagsForSelectedNotesError,
  } = useTagsForNotesQuery(
    selectedFilePaths.map((filePath) => filePath.toString())
  );

  const baseTagCounts = buildBaseTagCounts(tagsForSelectedNotes);
  const baseTagCountsKey = createTagCountsKey(baseTagCounts);

  const [tagCountState, setTagCountState] = useState<{
    baseKey: string;
    overrides: Map<string, number>;
  }>(() => ({
    baseKey: baseTagCountsKey,
    overrides: new Map<string, number>(),
  }));

  const currentOverrides =
    tagCountState.baseKey === baseTagCountsKey
      ? tagCountState.overrides
      : new Map<string, number>();

  const selectedTagCounts = mergeTagCounts(baseTagCounts, currentOverrides);

  function setSelectedTagCounts(
    action:
      | Map<string, number>
      | ((prev: Map<string, number>) => Map<string, number>)
  ) {
    setTagCountState((prev) => {
      const prevOverrides =
        prev.baseKey === baseTagCountsKey
          ? prev.overrides
          : new Map<string, number>();
      const merged = mergeTagCounts(baseTagCounts, prevOverrides);

      const nextMap = typeof action === 'function' ? action(merged) : action;

      const nextOverrides = new Map<string, number>();
      nextMap.forEach((value, key) => {
        if (baseTagCounts.get(key) !== value) {
          nextOverrides.set(key, value);
        }
      });

      return {
        baseKey: baseTagCountsKey,
        overrides: nextOverrides,
      };
    });
  }

  // Function to handle creating a new tag
  const handleCreateTag = async (tagName: string) => {
    // await createTags({ tagNames: [tagName] });
    setTagsCreatedButNotSaved((prev) => [...new Set([...prev, tagName])]);
    setSelectedTagCounts((prev) => {
      const next = new Map(prev);
      next.set(tagName, totalSelectedNotes);
      return next;
    });
    setSearchTerm('');
  };

  const allTagsInDialog = [
    ...new Set([...(allTags ?? []), ...tagsCreatedButNotSaved]),
  ];

  // Filter tags based on search term and sort alphabetically
  const displayedTags =
    allTagsInDialog
      ?.filter((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.localeCompare(b)) || [];

  // Get fully selected tags from the notes that were selected to open this dialog

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

  const hasTagData = allTagsInDialog && allTagsInDialog.length > 0;
  const anyTagDataLoading = areTagsLoading || areTagsForSelectedNotesLoading;

  return (
    <fieldset
      className="flex flex-col gap-2"
      data-tags-to-add-or-remove={JSON.stringify(tagsToAddOrRemove)}
    >
      <p>Select tags to add to or remove from {totalSelectedNotes} note(s) </p>

      <SelectedTagsDisplay
        selectedTagCounts={selectedTagCounts}
        setSelectedTagCounts={setSelectedTagCounts}
        totalSelectedNotes={totalSelectedNotes}
        setTagsCreatedButNotSaved={setTagsCreatedButNotSaved}
      />
      {(anyTagDataLoading || hasTagData) && (
        <div className="py-1.5">
          {anyTagDataLoading && <RouteFallback className="my-1" />}
          {hasTagData && (
            <>
              <TagSearchInput
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                onCreateTag={handleCreateTag}
                isLoading={areTagsLoading}
                hasError={areTagsError}
              />
              <TagSelectionList
                displayedTags={displayedTags}
                selectedTagCounts={selectedTagCounts}
                totalSelectedNotes={totalSelectedNotes}
                searchTerm={searchTerm}
                setSelectedTagCounts={setSelectedTagCounts}
                onCreateTag={handleCreateTag}
              />
            </>
          )}
        </div>
      )}
      {(areTagsError || areTagsForSelectedNotesError) && (
        <p className="text-red-500 text-sm">
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

function buildBaseTagCounts(
  tagsForSelectedNotes: Record<string, string[] | undefined> | undefined | null
) {
  const tagCounts = new Map<string, number>();

  if (!tagsForSelectedNotes) {
    return tagCounts;
  }

  Object.values(tagsForSelectedNotes).forEach((noteTags) => {
    (noteTags ?? []).forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  return tagCounts;
}

function createTagCountsKey(tagCounts: Map<string, number>) {
  const entries = Array.from(tagCounts.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return JSON.stringify(entries);
}

function mergeTagCounts(
  base: Map<string, number>,
  overrides: Map<string, number>
) {
  const merged = new Map(base);
  overrides.forEach((value, key) => {
    merged.set(key, value);
  });
  return merged;
}
